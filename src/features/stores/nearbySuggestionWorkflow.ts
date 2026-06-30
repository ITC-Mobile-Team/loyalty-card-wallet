import { isAppError } from "../../core/errors/AppError";
import {
  assessNearbySuggestions,
  sourceReferenceKey,
  type MerchantLinkRepository,
  type NearbySuggestionAssessment,
  type NearbySuggestionOutcome
} from "../../domain/stores/MerchantLinks";
import type { LocationProvider } from "../../domain/stores/LocationProvider";
import type { StoreRepository, StoreSearchResult } from "../../domain/stores/StoreRepository";

export type NearbyLookupResult = {
  assessment: NearbySuggestionAssessment;
  searchResult: StoreSearchResult | null;
  terminalOutcome?: NearbySuggestionOutcome;
};

export async function runNearbySuggestionLookup(input: {
  isCanceled?: () => boolean;
  locationProvider: LocationProvider;
  merchantLinkRepository: MerchantLinkRepository;
  radiusMeters?: number;
  storeRepository: StoreRepository;
}): Promise<NearbyLookupResult> {
  let stage: "location" | "network" | "storage" = "location";

  try {
    const location = await input.locationProvider.getCurrentLocation();

    if (input.isCanceled?.()) {
      return canceledResult();
    }

    stage = "network";
    const searchResult = await input.storeRepository.search({
      origin: {
        kind: "nearby",
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: input.radiusMeters ?? 2500
      }
    });

    if (input.isCanceled?.()) {
      return canceledResult();
    }

    if (searchResult.stores.length === 0) {
      return {
        assessment: { outcomes: [{ kind: "noNearbyStores" }], suggestions: [] },
        searchResult,
        terminalOutcome: { kind: "noNearbyStores" }
      };
    }

    stage = "storage";
    await input.merchantLinkRepository.ensureCardMerchants();
    const [merchants, links, dismissals] = await Promise.all([
      input.merchantLinkRepository.listCardMerchants(),
      input.merchantLinkRepository.listLinks(),
      input.merchantLinkRepository.listDismissals()
    ]);

    if (input.isCanceled?.()) {
      return canceledResult();
    }

    const staleSourceReferenceKeys = await resolveStaleSourceReferenceKeys(
      input.storeRepository,
      links,
      input.isCanceled
    );

    if (input.isCanceled?.()) {
      return canceledResult();
    }

    return {
      assessment: assessNearbySuggestions({
        dismissals,
        links,
        merchants,
        staleSourceReferenceKeys,
        stores: searchResult.stores
      }),
      searchResult
    };
  } catch (error) {
    const outcome = mapFailure(error, stage);

    return {
      assessment: { outcomes: [outcome], suggestions: [] },
      searchResult: null,
      terminalOutcome: outcome
    };
  }
}

async function resolveStaleSourceReferenceKeys(
  storeRepository: StoreRepository,
  links: Awaited<ReturnType<MerchantLinkRepository["listLinks"]>>,
  isCanceled: (() => boolean) | undefined
): Promise<string[]> {
  const references = links
    .map((link) => link.sourceReference)
    .filter((reference): reference is NonNullable<typeof reference> => reference !== undefined);

  if (references.length === 0 || isCanceled?.()) {
    return [];
  }

  try {
    const resolutions = await storeRepository.resolveSourceReferences(references);

    return resolutions
      .filter((resolution) => resolution.status === "missing")
      .map((resolution) =>
        sourceReferenceKey({
          ...resolution.reference,
          source: "openstreetmap"
        })
      );
  } catch {
    // Source verification is supplementary. A failed verification must not
    // convert a valid nearby result into a stale-source claim or block Cards.
    return [];
  }
}

function canceledResult(): NearbyLookupResult {
  const outcome: NearbySuggestionOutcome = { kind: "canceled" };
  return {
    assessment: { outcomes: [outcome], suggestions: [] },
    searchResult: null,
    terminalOutcome: outcome
  };
}

function mapFailure(
  error: unknown,
  stage: "location" | "network" | "storage"
): NearbySuggestionOutcome {
  if (isAppError(error)) {
    if (error.kind === "permission" && error.permission === "location") {
      return { kind: "permissionDenied" };
    }

    if (error.kind === "network") {
      return { kind: "networkFailure", retryable: error.retryable };
    }

    if (error.kind === "storage") {
      return { kind: "storageFailure" };
    }
  }

  if (stage === "location") {
    return { kind: "locationUnavailable" };
  }

  if (stage === "network") {
    return { kind: "networkFailure", retryable: true };
  }

  return { kind: "storageFailure" };
}
