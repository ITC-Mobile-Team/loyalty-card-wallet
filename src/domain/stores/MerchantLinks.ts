import type { StoreSummary } from "./StoreRepository";

export type OsmElementType = "node" | "relation" | "way";

export type MerchantSourceReference = {
  id: string;
  observedName?: string;
  source: "openstreetmap";
  type: OsmElementType;
};

export type CardMerchantCard = {
  cardId: string;
  cardNumberSuffix: string;
  storeName: string;
};

export type CardMerchant = {
  aliases: string[];
  cards: CardMerchantCard[];
  displayName: string;
  merchantKey: string;
  normalizedName: string;
};

export type MerchantLink = {
  aliases: string[];
  createdAt: string;
  displayName: string;
  enabled: boolean;
  id: string;
  merchantKey: string;
  sourceReference?: MerchantSourceReference;
  updatedAt: string;
};

export type MerchantSuggestionDismissal = {
  dismissedAt: string;
  merchantKey: string;
  sourceReference: MerchantSourceReference;
};

export type MerchantCandidate = {
  merchant: CardMerchant;
  reasons: string[];
  score: number;
};

export type NearbySuggestion =
  | {
      candidates: MerchantCandidate[];
      kind: "ambiguous";
      store: StoreSummary;
    }
  | {
      candidate: MerchantCandidate;
      kind: "candidate";
      store: StoreSummary;
    }
  | {
      kind: "confirmed";
      link: MerchantLink;
      merchant: CardMerchant;
      store: StoreSummary;
    }
  | {
      candidate: MerchantCandidate;
      kind: "staleSource";
      link: MerchantLink;
      store: StoreSummary;
    };

export type NearbySuggestionOutcome =
  | { kind: "permissionDenied" }
  | { kind: "locationUnavailable" }
  | { kind: "networkFailure"; retryable: boolean }
  | { kind: "noNearbyStores" }
  | { kind: "noCandidate"; storeId: string }
  | { kind: "ambiguousCandidate"; storeId: string }
  | { kind: "staleSource"; linkId: string; storeId: string }
  | { kind: "dismissedSuggestion"; merchantKey: string; storeId: string }
  | { kind: "disabledSuggestion"; linkId: string; storeId: string }
  | { kind: "storageFailure" }
  | { kind: "canceled" };

export type NearbySuggestionAssessment = {
  outcomes: NearbySuggestionOutcome[];
  suggestions: NearbySuggestion[];
};

export type ConfirmMerchantLinkInput = {
  aliases?: string[];
  displayName: string;
  merchantKey: string;
  sourceReference?: MerchantSourceReference;
};

export type MerchantLinkRepository = {
  confirm(input: ConfirmMerchantLinkInput): Promise<MerchantLink>;
  correct(linkId: string, input: Omit<ConfirmMerchantLinkInput, "sourceReference">): Promise<MerchantLink | null>;
  dismiss(input: { merchantKey: string; sourceReference: MerchantSourceReference }): Promise<void>;
  ensureCardMerchants(): Promise<void>;
  listCardMerchants(): Promise<CardMerchant[]>;
  listDismissals(): Promise<MerchantSuggestionDismissal[]>;
  listLinks(): Promise<MerchantLink[]>;
  remove(linkId: string): Promise<void>;
  repairSource(linkId: string, sourceReference: MerchantSourceReference): Promise<MerchantLink | null>;
  setEnabled(linkId: string, enabled: boolean): Promise<MerchantLink | null>;
};

const ignoredBusinessTokens = new Set([
  "company",
  "co",
  "inc",
  "llc",
  "ltd",
  "limited",
  "shop",
  "store",
  "stores",
  "market",
  "supermarket",
  "тов",
  "ат",
  "фоп"
]);

export function normalizeMerchantName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’'`"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createMerchantKey(value: string): string {
  const normalized = normalizeMerchantName(value);
  const compact = normalized.replace(/\s+/g, "-");

  return `merchant:${compact || "unknown"}`;
}

export function parseStoreSourceReference(store: StoreSummary): MerchantSourceReference | null {
  if (store.source !== "openstreetmap") {
    return null;
  }

  const match = /^(node|way|relation)\/(\d+)$/.exec(store.id);

  if (!match) {
    return null;
  }

  return {
    id: match[2],
    observedName: store.name,
    source: "openstreetmap",
    type: match[1] as OsmElementType
  };
}

export function sourceReferenceKey(reference: MerchantSourceReference): string {
  return `${reference.source}:${reference.type}:${reference.id}`;
}

export function scoreMerchantCandidate(store: StoreSummary, merchant: CardMerchant): MerchantCandidate {
  const storeNames = uniqueNormalized([store.name, store.brand, store.operator]);
  const merchantNames = uniqueNormalized([merchant.displayName, merchant.normalizedName, ...merchant.aliases]);
  let bestScore = 0;
  let reasons: string[] = [];

  for (const storeName of storeNames) {
    for (const merchantName of merchantNames) {
      const score = scoreNormalizedNames(storeName, merchantName);

      if (score.score > bestScore) {
        bestScore = score.score;
        reasons = score.reasons;
      }
    }
  }

  return {
    merchant,
    reasons,
    score: bestScore
  };
}

export function rankMerchantCandidates(
  store: StoreSummary,
  merchants: readonly CardMerchant[]
): MerchantCandidate[] {
  return merchants
    .map((merchant) => scoreMerchantCandidate(store, merchant))
    .filter((candidate) => candidate.score >= 0.92)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.merchant.displayName.localeCompare(right.merchant.displayName) ||
        left.merchant.merchantKey.localeCompare(right.merchant.merchantKey)
    );
}

export function assessNearbySuggestions(input: {
  dismissals: readonly MerchantSuggestionDismissal[];
  links: readonly MerchantLink[];
  merchants: readonly CardMerchant[];
  staleSourceReferenceKeys?: readonly string[];
  stores: readonly StoreSummary[];
}): NearbySuggestionAssessment {
  const suggestions: NearbySuggestion[] = [];
  const outcomes: NearbySuggestionOutcome[] = [];
  const merchantsWithLinkAliases = input.merchants.map((merchant) => {
    const relatedLinks = input.links.filter((link) => link.merchantKey === merchant.merchantKey);
    return {
      ...merchant,
      aliases: [
        ...new Set([
          ...merchant.aliases,
          ...relatedLinks.flatMap((link) => [
            link.displayName,
            ...link.aliases,
            link.sourceReference?.observedName ?? ""
          ])
        ])
      ].filter(Boolean)
    };
  });
  const merchantsByKey = new Map(
    merchantsWithLinkAliases.map((merchant) => [merchant.merchantKey, merchant])
  );
  const dismissals = new Set(
    input.dismissals.map(
      (dismissal) => `${dismissal.merchantKey}|${sourceReferenceKey(dismissal.sourceReference)}`
    )
  );
  const staleSourceReferenceKeys = new Set(input.staleSourceReferenceKeys ?? []);

  for (const store of input.stores) {
    const sourceReference = parseStoreSourceReference(store);
    const sourceKey = sourceReference ? sourceReferenceKey(sourceReference) : null;
    const exactLink = sourceKey
      ? input.links.find(
          (link) =>
            link.sourceReference && sourceReferenceKey(link.sourceReference) === sourceKey
        )
      : undefined;

    if (exactLink) {
      const merchant = merchantsByKey.get(exactLink.merchantKey);

      if (!exactLink.enabled) {
        outcomes.push({ kind: "disabledSuggestion", linkId: exactLink.id, storeId: store.id });
      } else if (merchant) {
        suggestions.push({ kind: "confirmed", link: exactLink, merchant, store });
      }

      continue;
    }

    const candidates = rankMerchantCandidates(store, merchantsWithLinkAliases);

    if (candidates.length === 0) {
      outcomes.push({ kind: "noCandidate", storeId: store.id });
      continue;
    }

    const availableCandidates = candidates.filter((candidate) => {
      if (!sourceReference) {
        return true;
      }

      const dismissalKey = `${candidate.merchant.merchantKey}|${sourceReferenceKey(sourceReference)}`;

      if (dismissals.has(dismissalKey)) {
        outcomes.push({
          kind: "dismissedSuggestion",
          merchantKey: candidate.merchant.merchantKey,
          storeId: store.id
        });
        return false;
      }

      return true;
    });

    if (availableCandidates.length === 0) {
      continue;
    }

    const top = availableCandidates[0];
    const second = availableCandidates[1];

    if (second && top.score - second.score < 0.08) {
      suggestions.push({ candidates: availableCandidates.slice(0, 3), kind: "ambiguous", store });
      outcomes.push({ kind: "ambiguousCandidate", storeId: store.id });
      continue;
    }

    const staleLink = input.links.find(
      (link) =>
        link.merchantKey === top.merchant.merchantKey &&
        link.sourceReference !== undefined &&
        staleSourceReferenceKeys.has(sourceReferenceKey(link.sourceReference))
    );

    if (staleLink) {
      if (!staleLink.enabled) {
        outcomes.push({ kind: "disabledSuggestion", linkId: staleLink.id, storeId: store.id });
      } else {
        suggestions.push({ candidate: top, kind: "staleSource", link: staleLink, store });
        outcomes.push({ kind: "staleSource", linkId: staleLink.id, storeId: store.id });
      }
      continue;
    }

    suggestions.push({ candidate: top, kind: "candidate", store });
  }

  return { outcomes, suggestions };
}

function scoreNormalizedNames(left: string, right: string): { reasons: string[]; score: number } {
  if (!left || !right) {
    return { reasons: [], score: 0 };
  }

  if (left === right) {
    return { reasons: ["exact normalized name"], score: 1 };
  }

  const leftCore = removeIgnoredBusinessTokens(left);
  const rightCore = removeIgnoredBusinessTokens(right);

  if (leftCore && leftCore === rightCore) {
    return { reasons: ["exact name after generic business words"], score: 0.97 };
  }

  const leftCompact = leftCore.replace(/\s+/g, "");
  const rightCompact = rightCore.replace(/\s+/g, "");

  if (
    leftCompact.length >= 8 &&
    rightCompact.length >= 8 &&
    (leftCompact.startsWith(rightCompact) || rightCompact.startsWith(leftCompact))
  ) {
    const ratio = Math.min(leftCompact.length, rightCompact.length) / Math.max(leftCompact.length, rightCompact.length);

    if (ratio >= 0.9) {
      return { reasons: ["high-overlap normalized name"], score: 0.92 };
    }
  }

  return { reasons: [], score: 0 };
}

function removeIgnoredBusinessTokens(value: string): string {
  return value
    .split(" ")
    .filter((token) => token && !ignoredBusinessTokens.has(token))
    .join(" ");
}

function uniqueNormalized(values: readonly (string | undefined)[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map(normalizeMerchantName)
        .filter(Boolean)
    )
  ];
}
