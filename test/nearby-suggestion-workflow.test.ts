import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryMerchantLinkRepository } from "../src/data/stores/InMemoryMerchantLinkRepository";
import type { CardMerchant, MerchantSourceReference } from "../src/domain/stores/MerchantLinks";
import type { LocationProvider } from "../src/domain/stores/LocationProvider";
import type {
  StoreRepository,
  StoreSearchQuery,
  StoreSearchResult,
  StoreSourceIdentity,
  StoreSourceResolution
} from "../src/domain/stores/StoreRepository";
import { runNearbySuggestionLookup } from "../src/features/stores/nearbySuggestionWorkflow";

const merchant: CardMerchant = {
  aliases: ["Silpo"],
  cards: [{ cardId: "card-1", cardNumberSuffix: "1234", storeName: "Сільпо" }],
  displayName: "Сільпо",
  merchantKey: "merchant:сільпо",
  normalizedName: "сільпо"
};

test("nearby orchestration requests location once, performs one origin request, and returns no coordinate history", async () => {
  let locationCalls = 0;
  const capturedQueries: StoreSearchQuery[] = [];
  const locationProvider: LocationProvider = {
    async getCurrentLocation() {
      locationCalls += 1;
      return { latitude: 50.450123, longitude: 30.523456 };
    }
  };
  const storeRepository = fakeStoreRepository(async (query) => {
    capturedQueries.push(query);
    return resultWithStore("node/1", "Silpo");
  });

  const result = await runNearbySuggestionLookup({
    locationProvider,
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository
  });

  assert.equal(locationCalls, 1);
  assert.equal(capturedQueries[0]?.origin.kind, "nearby");
  assert.equal(result.assessment.suggestions[0]?.kind, "candidate");
  assert.equal(JSON.stringify(result).includes("50.450123"), false);
  assert.equal(JSON.stringify(result).includes("30.523456"), false);
});

test("permission, unavailable location, network, empty, cancellation, and storage failures are typed", async () => {
  const storeRepository = fakeStoreRepository(async () => resultWithStore("node/1", "Silpo"));

  const permission = await runNearbySuggestionLookup({
    locationProvider: {
      async getCurrentLocation() {
        throw { kind: "permission", message: "denied", permission: "location" };
      }
    },
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository
  });
  assert.equal(permission.terminalOutcome?.kind, "permissionDenied");

  const unavailable = await runNearbySuggestionLookup({
    locationProvider: {
      async getCurrentLocation() {
        throw new Error("provider unavailable");
      }
    },
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository
  });
  assert.equal(unavailable.terminalOutcome?.kind, "locationUnavailable");

  const network = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository: fakeStoreRepository(async () => {
      throw { kind: "network", message: "offline", retryable: true };
    })
  });
  assert.deepEqual(network.terminalOutcome, { kind: "networkFailure", retryable: true });

  const empty = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository: fakeStoreRepository(async () => ({
      sourceAttribution: "OSM",
      stores: [],
      total: 0
    }))
  });
  assert.equal(empty.terminalOutcome?.kind, "noNearbyStores");

  const canceled = await runNearbySuggestionLookup({
    isCanceled: () => true,
    locationProvider: fixedLocation(),
    merchantLinkRepository: new InMemoryMerchantLinkRepository([merchant]),
    storeRepository
  });
  assert.equal(canceled.terminalOutcome?.kind, "canceled");

  class FailingMerchantLinkRepository extends InMemoryMerchantLinkRepository {
    override async ensureCardMerchants(): Promise<void> {
      throw { kind: "storage", message: "failed" };
    }
  }
  const storage = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: new FailingMerchantLinkRepository([merchant]),
    storeRepository
  });
  assert.equal(storage.terminalOutcome?.kind, "storageFailure");
});

test("matching failure does not mutate merchant links or card access state", async () => {
  const repository = new InMemoryMerchantLinkRepository([merchant]);
  const result = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: repository,
    storeRepository: fakeStoreRepository(async () => resultWithStore("node/9", "Independent Bakery"))
  });

  assert.equal(result.assessment.suggestions.length, 0);
  assert.equal(result.assessment.outcomes[0]?.kind, "noCandidate");
  assert.deepEqual(await repository.listLinks(), []);
  assert.equal((await repository.listCardMerchants())[0].cards[0].cardId, "card-1");
});

test("stale-source repair is offered only after an explicit missing OSM resolution", async () => {
  const repository = new InMemoryMerchantLinkRepository([merchant]);
  const oldReference: MerchantSourceReference = {
    id: "101",
    observedName: "Silpo",
    source: "openstreetmap",
    type: "node"
  };
  await repository.confirm({
    displayName: merchant.displayName,
    merchantKey: merchant.merchantKey,
    sourceReference: oldReference
  });
  const storeRepository = fakeStoreRepository(
    async () => resultWithStore("way/202", "Silpo"),
    async (references) =>
      references.map((reference) => ({
        reference,
        status: "missing"
      }))
  );

  const result = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: repository,
    storeRepository
  });

  assert.equal(result.assessment.suggestions[0]?.kind, "staleSource");
});

test("a valid OSM source outside nearby results remains a normal candidate", async () => {
  const repository = new InMemoryMerchantLinkRepository([merchant]);
  await repository.confirm({
    displayName: merchant.displayName,
    merchantKey: merchant.merchantKey,
    sourceReference: {
      id: "303",
      observedName: "Silpo",
      source: "openstreetmap",
      type: "node"
    }
  });
  const storeRepository = fakeStoreRepository(
    async () => resultWithStore("way/404", "Silpo"),
    async (references) =>
      references.map((reference) => ({
        reference,
        status: "found",
        store: { id: `${reference.type}/${reference.id}`, name: "Silpo", source: "openstreetmap" }
      }))
  );

  const result = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: repository,
    storeRepository
  });

  assert.equal(result.assessment.suggestions[0]?.kind, "candidate");
  assert.equal(result.assessment.outcomes.some((outcome) => outcome.kind === "staleSource"), false);
});

test("source verification failure does not create a stale claim or block nearby candidates", async () => {
  const repository = new InMemoryMerchantLinkRepository([merchant]);
  await repository.confirm({
    displayName: merchant.displayName,
    merchantKey: merchant.merchantKey,
    sourceReference: {
      id: "505",
      observedName: "Silpo",
      source: "openstreetmap",
      type: "node"
    }
  });
  const storeRepository = fakeStoreRepository(
    async () => resultWithStore("way/606", "Silpo"),
    async () => {
      throw { kind: "network", message: "verification unavailable", retryable: true };
    }
  );

  const result = await runNearbySuggestionLookup({
    locationProvider: fixedLocation(),
    merchantLinkRepository: repository,
    storeRepository
  });

  assert.equal(result.assessment.suggestions[0]?.kind, "candidate");
  assert.equal(result.terminalOutcome, undefined);
});

function fixedLocation(): LocationProvider {
  return {
    async getCurrentLocation() {
      return { latitude: 50, longitude: 30 };
    }
  };
}

function resultWithStore(id: string, name: string): StoreSearchResult {
  return {
    sourceAttribution: "OSM",
    stores: [{ id, name, source: "openstreetmap" }],
    total: 1
  };
}

function fakeStoreRepository(
  search: (query: StoreSearchQuery) => Promise<StoreSearchResult>,
  resolveSourceReferences: (
    references: readonly StoreSourceIdentity[]
  ) => Promise<StoreSourceResolution[]> = async (references) =>
    references.map((reference) => ({ reference, status: "found" }))
): StoreRepository {
  return {
    async getCachedById() {
      return null;
    },
    resolveSourceReferences,
    search
  };
}
