import { base64UrlToString, stringToBase64Url } from "../../core/encoding/base64url";
import { isBarcodeFormat, type LoyaltyCard } from "../cards/Card";

export const EXTERNAL_SNAPSHOT_APP = "loyalty-card-wallet";
export const EXTERNAL_SNAPSHOT_ENVELOPE_VERSION = 1;
export const EXTERNAL_SNAPSHOT_PAYLOAD_VERSION = 1;
export const EXTERNAL_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export type ExternalSnapshotIntegrityHasher = {
  sha256(value: string): Promise<string>;
};

export type ExternalCardSnapshotActiveEntry = {
  sourceCardId: string;
  revision: number;
  generatedAt: string;
  state: "active";
  storeName: string;
  cardNumber: string;
  barcodeFormat: LoyaltyCard["barcodeFormat"];
  backgroundColor?: string;
};

export type ExternalCardSnapshotRevokedEntry = {
  sourceCardId: string;
  revision: number;
  generatedAt: string;
  state: "revoked";
};

export type ExternalCardSnapshotEntry = ExternalCardSnapshotActiveEntry | ExternalCardSnapshotRevokedEntry;

export type ExternalCardSnapshotPayloadV1 = {
  app: typeof EXTERNAL_SNAPSHOT_APP;
  snapshotVersion: typeof EXTERNAL_SNAPSHOT_PAYLOAD_VERSION;
  revision: number;
  generatedAt: string;
  expiresAt: string;
  entries: ExternalCardSnapshotEntry[];
};

export type ExternalCardSnapshotEnvelopeV1 = {
  app: typeof EXTERNAL_SNAPSHOT_APP;
  envelopeVersion: typeof EXTERNAL_SNAPSHOT_ENVELOPE_VERSION;
  payload: string;
  integrity: {
    algorithm: "sha256";
    digest: string;
  };
};

export type ExternalSnapshotDocumentOutcome =
  | { status: "ready"; snapshot: ExternalCardSnapshotPayloadV1 }
  | { status: "missing" }
  | { status: "stale"; snapshot: ExternalCardSnapshotPayloadV1 }
  | { status: "futureVersion"; envelopeVersion?: number; snapshotVersion?: number }
  | { status: "corrupt" };

export type ExternalCardSnapshotOutcome =
  | { status: "ready"; entry: ExternalCardSnapshotActiveEntry; snapshotRevision: number }
  | { status: "missing" }
  | { status: "stale" }
  | { status: "revoked"; sourceCardId: string }
  | { status: "notSelected"; sourceCardId?: string }
  | { status: "futureVersion" }
  | { status: "corrupt" };

export function createEmptyExternalSnapshot(now: Date): ExternalCardSnapshotPayloadV1 {
  const generatedAt = now.toISOString();
  return {
    app: EXTERNAL_SNAPSHOT_APP,
    snapshotVersion: EXTERNAL_SNAPSHOT_PAYLOAD_VERSION,
    revision: 0,
    generatedAt,
    expiresAt: new Date(now.getTime() + EXTERNAL_SNAPSHOT_MAX_AGE_MS).toISOString(),
    entries: []
  };
}

export function projectSelectedCard(
  snapshot: ExternalCardSnapshotPayloadV1,
  card: LoyaltyCard,
  now: Date
): ExternalCardSnapshotPayloadV1 {
  const existing = snapshot.entries.find((entry) => entry.sourceCardId === card.id);
  const generatedAt = now.toISOString();
  const nextEntry: ExternalCardSnapshotActiveEntry = {
    sourceCardId: card.id,
    revision: (existing?.revision ?? 0) + 1,
    generatedAt,
    state: "active",
    storeName: card.storeName.trim(),
    cardNumber: card.cardNumber.trim(),
    barcodeFormat: card.barcodeFormat,
    ...(card.backgroundColor ? { backgroundColor: card.backgroundColor } : {})
  };

  return nextSnapshot(snapshot, generatedAt, [
    ...snapshot.entries.filter((entry) => entry.sourceCardId !== card.id),
    nextEntry
  ]);
}

export function revokeSelectedCard(
  snapshot: ExternalCardSnapshotPayloadV1,
  sourceCardId: string,
  now: Date
): ExternalCardSnapshotPayloadV1 {
  const existing = snapshot.entries.find((entry) => entry.sourceCardId === sourceCardId);
  const generatedAt = now.toISOString();
  const revoked: ExternalCardSnapshotRevokedEntry = {
    sourceCardId,
    revision: (existing?.revision ?? 0) + 1,
    generatedAt,
    state: "revoked"
  };

  return nextSnapshot(snapshot, generatedAt, [
    ...snapshot.entries.filter((entry) => entry.sourceCardId !== sourceCardId),
    revoked
  ]);
}

export function isCardSelected(snapshot: ExternalCardSnapshotPayloadV1, sourceCardId: string): boolean {
  return snapshot.entries.some((entry) => entry.sourceCardId === sourceCardId && entry.state === "active");
}

export async function encodeExternalSnapshot(
  snapshot: ExternalCardSnapshotPayloadV1,
  hasher: ExternalSnapshotIntegrityHasher
): Promise<string> {
  const canonicalSnapshot = canonicalizeSnapshot(snapshot);
  const payload = stringToBase64Url(JSON.stringify(canonicalSnapshot));
  const envelope: ExternalCardSnapshotEnvelopeV1 = {
    app: EXTERNAL_SNAPSHOT_APP,
    envelopeVersion: EXTERNAL_SNAPSHOT_ENVELOPE_VERSION,
    payload,
    integrity: {
      algorithm: "sha256",
      digest: await hasher.sha256(payload)
    }
  };

  return JSON.stringify(envelope);
}

export async function decodeExternalSnapshot(
  serialized: string,
  now: Date,
  hasher: ExternalSnapshotIntegrityHasher
): Promise<ExternalSnapshotDocumentOutcome> {
  try {
    const envelope = JSON.parse(serialized) as unknown;
    if (!isObject(envelope) || envelope.app !== EXTERNAL_SNAPSHOT_APP) {
      return { status: "corrupt" };
    }

    if (typeof envelope.envelopeVersion !== "number") {
      return { status: "corrupt" };
    }

    if (envelope.envelopeVersion > EXTERNAL_SNAPSHOT_ENVELOPE_VERSION) {
      return { status: "futureVersion", envelopeVersion: envelope.envelopeVersion };
    }

    if (
      envelope.envelopeVersion !== EXTERNAL_SNAPSHOT_ENVELOPE_VERSION ||
      typeof envelope.payload !== "string" ||
      !isObject(envelope.integrity) ||
      envelope.integrity.algorithm !== "sha256" ||
      typeof envelope.integrity.digest !== "string"
    ) {
      return { status: "corrupt" };
    }

    const digest = await hasher.sha256(envelope.payload);
    if (!constantTimeEqual(digest, envelope.integrity.digest)) {
      return { status: "corrupt" };
    }

    const payload = JSON.parse(base64UrlToString(envelope.payload)) as unknown;
    if (!isObject(payload) || typeof payload.snapshotVersion !== "number") {
      return { status: "corrupt" };
    }

    if (payload.snapshotVersion > EXTERNAL_SNAPSHOT_PAYLOAD_VERSION) {
      return { status: "futureVersion", snapshotVersion: payload.snapshotVersion };
    }

    const snapshot = validatePayloadV1(payload);
    if (!snapshot) {
      return { status: "corrupt" };
    }

    return Date.parse(snapshot.expiresAt) <= now.getTime()
      ? { status: "stale", snapshot }
      : { status: "ready", snapshot };
  } catch {
    return { status: "corrupt" };
  }
}

export function resolveExternalCardSnapshot(
  outcome: ExternalSnapshotDocumentOutcome,
  sourceCardId?: string
): ExternalCardSnapshotOutcome {
  if (outcome.status !== "ready") {
    return outcome.status === "futureVersion"
      ? { status: "futureVersion" }
      : outcome.status === "corrupt"
        ? { status: "corrupt" }
        : outcome.status === "stale"
          ? { status: "stale" }
          : { status: "missing" };
  }

  const candidates = sourceCardId
    ? outcome.snapshot.entries.filter((entry) => entry.sourceCardId === sourceCardId)
    : outcome.snapshot.entries;
  const active = candidates.find((entry): entry is ExternalCardSnapshotActiveEntry => entry.state === "active");
  if (active) {
    return { status: "ready", entry: active, snapshotRevision: outcome.snapshot.revision };
  }

  const revoked = candidates.find((entry) => entry.state === "revoked");
  if (revoked) {
    return { status: "revoked", sourceCardId: revoked.sourceCardId };
  }

  return { status: "notSelected", ...(sourceCardId ? { sourceCardId } : {}) };
}

export function externalSurfaceDeepLink(outcome: ExternalCardSnapshotOutcome): string {
  return outcome.status === "ready"
    ? `loyaltycardwallet:///card/${encodeURIComponent(outcome.entry.sourceCardId)}/scan-mode`
    : "loyaltycardwallet://";
}

function nextSnapshot(
  snapshot: ExternalCardSnapshotPayloadV1,
  generatedAt: string,
  entries: ExternalCardSnapshotEntry[]
): ExternalCardSnapshotPayloadV1 {
  return canonicalizeSnapshot({
    app: EXTERNAL_SNAPSHOT_APP,
    snapshotVersion: EXTERNAL_SNAPSHOT_PAYLOAD_VERSION,
    revision: snapshot.revision + 1,
    generatedAt,
    expiresAt: new Date(Date.parse(generatedAt) + EXTERNAL_SNAPSHOT_MAX_AGE_MS).toISOString(),
    entries
  });
}

function canonicalizeSnapshot(snapshot: ExternalCardSnapshotPayloadV1): ExternalCardSnapshotPayloadV1 {
  return {
    app: EXTERNAL_SNAPSHOT_APP,
    snapshotVersion: EXTERNAL_SNAPSHOT_PAYLOAD_VERSION,
    revision: snapshot.revision,
    generatedAt: snapshot.generatedAt,
    expiresAt: snapshot.expiresAt,
    entries: [...snapshot.entries]
      .sort((left, right) => left.sourceCardId.localeCompare(right.sourceCardId))
      .map((entry) =>
        entry.state === "active"
          ? {
              sourceCardId: entry.sourceCardId,
              revision: entry.revision,
              generatedAt: entry.generatedAt,
              state: "active" as const,
              storeName: entry.storeName,
              cardNumber: entry.cardNumber,
              barcodeFormat: entry.barcodeFormat,
              ...(entry.backgroundColor ? { backgroundColor: entry.backgroundColor } : {})
            }
          : {
              sourceCardId: entry.sourceCardId,
              revision: entry.revision,
              generatedAt: entry.generatedAt,
              state: "revoked" as const
            }
      )
  };
}

function validatePayloadV1(value: Record<string, unknown>): ExternalCardSnapshotPayloadV1 | null {
  if (
    value.app !== EXTERNAL_SNAPSHOT_APP ||
    value.snapshotVersion !== EXTERNAL_SNAPSHOT_PAYLOAD_VERSION ||
    !isPositiveInteger(value.revision, true) ||
    !isIsoTimestamp(value.generatedAt) ||
    !isIsoTimestamp(value.expiresAt) ||
    !Array.isArray(value.entries)
  ) {
    return null;
  }

  const entries: ExternalCardSnapshotEntry[] = [];
  const seenIds = new Set<string>();
  for (const candidate of value.entries) {
    if (!isObject(candidate)) return null;
    const sourceCardId = nonEmptyString(candidate.sourceCardId);
    if (
      !sourceCardId ||
      seenIds.has(sourceCardId) ||
      !isPositiveInteger(candidate.revision) ||
      !isIsoTimestamp(candidate.generatedAt)
    ) {
      return null;
    }
    seenIds.add(sourceCardId);

    if (candidate.state === "revoked") {
      const allowed = new Set(["sourceCardId", "revision", "generatedAt", "state"]);
      if (Object.keys(candidate).some((key) => !allowed.has(key))) return null;
      entries.push({
        sourceCardId,
        revision: candidate.revision as number,
        generatedAt: candidate.generatedAt as string,
        state: "revoked"
      });
      continue;
    }

    const storeName = nonEmptyString(candidate.storeName);
    const cardNumber = nonEmptyString(candidate.cardNumber);
    if (
      candidate.state !== "active" ||
      !storeName ||
      !cardNumber ||
      typeof candidate.barcodeFormat !== "string" ||
      !isBarcodeFormat(candidate.barcodeFormat) ||
      (candidate.backgroundColor !== undefined && typeof candidate.backgroundColor !== "string")
    ) {
      return null;
    }

    const allowed = new Set([
      "sourceCardId",
      "revision",
      "generatedAt",
      "state",
      "storeName",
      "cardNumber",
      "barcodeFormat",
      "backgroundColor"
    ]);
    if (Object.keys(candidate).some((key) => !allowed.has(key))) return null;
    entries.push({
      sourceCardId,
      revision: candidate.revision as number,
      generatedAt: candidate.generatedAt as string,
      state: "active",
      storeName,
      cardNumber,
      barcodeFormat: candidate.barcodeFormat,
      ...(candidate.backgroundColor ? { backgroundColor: candidate.backgroundColor as string } : {})
    });
  }

  return canonicalizeSnapshot({
    app: EXTERNAL_SNAPSHOT_APP,
    snapshotVersion: EXTERNAL_SNAPSHOT_PAYLOAD_VERSION,
    revision: value.revision as number,
    generatedAt: value.generatedAt as string,
    expiresAt: value.expiresAt as string,
    entries
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isPositiveInteger(value: unknown, allowZero = false): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    (allowZero ? value >= 0 : value > 0)
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
