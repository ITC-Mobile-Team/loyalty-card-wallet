import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { base64UrlToString, stringToBase64Url } from "../src/core/encoding/base64url";
import { InMemorySharedSnapshotStorage } from "../src/data/external-surfaces/InMemorySharedSnapshotStorage";
import { JsonExternalSnapshotRepository } from "../src/data/external-surfaces/JsonExternalSnapshotRepository";
import { ExternalSnapshotAwareCardRepository } from "../src/data/external-surfaces/ExternalSnapshotAwareCardRepository";
import { InMemoryCardRepository } from "../src/data/cards/InMemoryCardRepository";
import {
  NativeSharedSnapshotStorage,
  type ExternalSnapshotStorageModule
} from "../src/data/external-surfaces/NativeSharedSnapshotStorage";
import {
  createEmptyExternalSnapshot,
  decodeExternalSnapshot,
  encodeExternalSnapshot,
  externalSurfaceDeepLink,
  projectSelectedCard,
  resolveExternalCardSnapshot
} from "../src/domain/external-surfaces/ExternalCardSnapshot";
import type { SharedSnapshotStorage } from "../src/domain/external-surfaces/ExternalSnapshotPorts";
import type { LoyaltyCard } from "../src/domain/cards/Card";

const hasher = {
  async sha256(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
};

const now = new Date("2026-01-02T03:04:05.000Z");
const card: LoyaltyCard = {
  id: "card-1",
  storeName: "Synthetic Market",
  cardNumber: "1234567890",
  barcodeFormat: "code128",
  backgroundColor: "#112233",
  notes: "must never leave the app",
  primaryImageId: "private-image",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

test("external snapshot v1 matches the golden fixture", async () => {
  const snapshot = projectSelectedCard(createEmptyExternalSnapshot(now), card, now);
  const encoded = await encodeExternalSnapshot(snapshot, hasher);
  const fixture = readFileSync("test/fixtures/external-snapshot-v1.json", "utf8").trim();
  assert.equal(encoded, fixture);
});

test("projection is deterministic, minimal, sorted, and explicit opt-in only", async () => {
  const secondCard: LoyaltyCard = {
    ...card,
    id: "card-0",
    storeName: "Another Market",
    notes: "secret note",
    primaryImageId: "private-image-2"
  };
  let snapshot = createEmptyExternalSnapshot(now);
  snapshot = projectSelectedCard(snapshot, card, now);
  snapshot = projectSelectedCard(snapshot, secondCard, now);
  const encoded = await encodeExternalSnapshot(snapshot, hasher);
  const envelope = JSON.parse(encoded);
  const payload = base64UrlToString(envelope.payload);

  assert.deepEqual(snapshot.entries.map((entry) => entry.sourceCardId), ["card-0", "card-1"]);
  assert.equal(payload.includes("notes"), false);
  assert.equal(payload.includes("private-image"), false);
  assert.equal(payload.includes("diagnostics"), false);
  assert.equal(payload.includes("passphrase"), false);
  assert.equal(payload.includes("latitude"), false);
  assert.equal(payload.includes("longitude"), false);
  assert.equal(payload.includes("not-selected"), false);
});

test("repository increments revisions, synchronizes selected cards, and revokes without card fields", async () => {
  const storage = new InMemorySharedSnapshotStorage();
  const repository = new JsonExternalSnapshotRepository(storage, hasher);

  assert.equal(await repository.isSelected(card.id, now), false);
  const selected = await repository.select(card, now);
  assert.equal(selected.revision, 1);
  assert.equal(selected.entries[0]?.revision, 1);

  const synchronized = await repository.synchronize(
    { ...card, storeName: "Renamed Market" },
    new Date("2026-01-03T03:04:05.000Z")
  );
  assert.equal(synchronized?.revision, 2);
  assert.equal(synchronized?.entries[0]?.revision, 2);
  assert.equal(synchronized?.entries[0]?.state, "active");
  assert.equal(synchronized?.entries[0]?.state === "active" && synchronized.entries[0].storeName, "Renamed Market");

  const revoked = await repository.revoke(card.id, new Date("2026-01-04T03:04:05.000Z"));
  assert.equal(revoked.revision, 3);
  assert.deepEqual(revoked.entries[0], {
    sourceCardId: card.id,
    revision: 3,
    generatedAt: "2026-01-04T03:04:05.000Z",
    state: "revoked"
  });
  assert.equal((await repository.resolve(card.id, new Date("2026-01-04T03:04:06.000Z"))).status, "revoked");
  assert.equal(storage.notificationCount, 3);
});

test("card repository decorator synchronizes updates and revokes every deletion path", async () => {
  const storage = new InMemorySharedSnapshotStorage();
  const snapshots = new JsonExternalSnapshotRepository(storage, hasher);
  const cards = new InMemoryCardRepository([card]);
  const repository = new ExternalSnapshotAwareCardRepository(cards, snapshots);
  await snapshots.select(card, now);

  const updated = await repository.update(card.id, { storeName: "Updated Everywhere" });
  assert.equal(updated?.storeName, "Updated Everywhere");
  const selected = await snapshots.resolve(card.id);
  assert.equal(selected.status, "ready");
  assert.equal(selected.status === "ready" && selected.entry.storeName, "Updated Everywhere");

  await repository.delete(card.id);
  assert.equal(await repository.getById(card.id), null);
  assert.equal((await snapshots.resolve(card.id)).status, "revoked");
});

test("missing, stale, future, corrupt, revoked, and not-selected snapshots are typed", async () => {
  assert.equal(resolveExternalCardSnapshot({ status: "missing" }).status, "missing");

  const fixture = readFileSync("test/fixtures/external-snapshot-v1.json", "utf8").trim();
  assert.equal((await decodeExternalSnapshot(fixture, new Date("2026-02-02T00:00:00.000Z"), hasher)).status, "stale");

  const futureEnvelope = JSON.parse(fixture);
  futureEnvelope.envelopeVersion = 2;
  assert.equal(
    (await decodeExternalSnapshot(JSON.stringify(futureEnvelope), now, hasher)).status,
    "futureVersion"
  );

  const futurePayloadEnvelope = JSON.parse(fixture);
  const futurePayload = JSON.parse(base64UrlToString(futurePayloadEnvelope.payload));
  futurePayload.snapshotVersion = 2;
  futurePayloadEnvelope.payload = stringToBase64Url(JSON.stringify(futurePayload));
  futurePayloadEnvelope.integrity.digest = await hasher.sha256(futurePayloadEnvelope.payload);
  assert.equal(
    (await decodeExternalSnapshot(JSON.stringify(futurePayloadEnvelope), now, hasher)).status,
    "futureVersion"
  );

  const corrupt = JSON.parse(fixture);
  corrupt.integrity.digest = "0".repeat(64);
  assert.equal((await decodeExternalSnapshot(JSON.stringify(corrupt), now, hasher)).status, "corrupt");

  const ready = await decodeExternalSnapshot(fixture, now, hasher);
  assert.equal(resolveExternalCardSnapshot(ready, "unknown").status, "notSelected");
});

test("unknown or sensitive entry fields are rejected even with a valid digest", async () => {
  const fixture = JSON.parse(readFileSync("test/fixtures/external-snapshot-v1.json", "utf8"));
  const payload = JSON.parse(base64UrlToString(fixture.payload));
  payload.entries[0].notes = "secret";
  fixture.payload = stringToBase64Url(JSON.stringify(payload));
  fixture.integrity.digest = await hasher.sha256(fixture.payload);

  assert.equal((await decodeExternalSnapshot(JSON.stringify(fixture), now, hasher)).status, "corrupt");
});

test("widget deep links open scan mode only for a ready selected card", async () => {
  const fixture = readFileSync("test/fixtures/external-snapshot-v1.json", "utf8").trim();
  const ready = resolveExternalCardSnapshot(await decodeExternalSnapshot(fixture, now, hasher), card.id);
  assert.equal(externalSurfaceDeepLink(ready), "loyaltycardwallet:///card/card-1/scan-mode");
  assert.equal(externalSurfaceDeepLink({ status: "corrupt" }), "loyaltycardwallet://");
  assert.equal(externalSurfaceDeepLink({ status: "stale" }), "loyaltycardwallet://");
});

function sharedStorageContract(name: string, create: () => SharedSnapshotStorage) {
  test(`${name} shared snapshot storage contract`, async () => {
    const storage = create();
    assert.equal(storage.isAvailable(), true);
    assert.equal(await storage.read(), null);
    await storage.write("snapshot");
    assert.equal(await storage.read(), "snapshot");
    await storage.notifyChanged();
    await storage.clear();
    assert.equal(await storage.read(), null);
  });
}

sharedStorageContract("in-memory", () => new InMemorySharedSnapshotStorage());

sharedStorageContract("native adapter", () => {
  let value: string | null = null;
  const module: ExternalSnapshotStorageModule = {
    async read() {
      return value;
    },
    async write(serialized) {
      value = serialized;
    },
    async clear() {
      value = null;
    },
    async notifyChanged() {}
  };
  return new NativeSharedSnapshotStorage(module);
});
