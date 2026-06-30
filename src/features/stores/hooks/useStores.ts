import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import {
  assessNearbySuggestions,
  parseStoreSourceReference,
  type CardMerchant,
  type MerchantLink,
  type NearbySuggestionAssessment,
  type NearbySuggestion,
  type NearbySuggestionOutcome
} from "@/domain/stores/MerchantLinks";
import type { StoreSummary } from "@/domain/stores/StoreRepository";
import { runNearbySuggestionLookup } from "@/features/stores/nearbySuggestionWorkflow";

export type StoresState = {
  cardMerchants: CardMerchant[];
  city: string;
  confirmSuggestion: (store: StoreSummary, merchantKey: string) => Promise<void>;
  correctMerchantLink: (linkId: string, merchantKey: string) => Promise<void>;
  dismissSuggestion: (store: StoreSummary, merchantKey: string) => Promise<void>;
  error: AppError | null;
  isLoading: boolean;
  isUsingLocation: boolean;
  merchantLinks: MerchantLink[];
  nearbyOutcomes: NearbySuggestionOutcome[];
  nearbySuggestions: NearbySuggestion[];
  refresh: () => Promise<void>;
  removeMerchantLink: (linkId: string) => Promise<void>;
  repairSuggestion: (linkId: string, store: StoreSummary) => Promise<void>;
  requestCurrentLocation: () => Promise<void>;
  searchCity: () => Promise<void>;
  searchTerm: string;
  setCity: (city: string) => void;
  setMerchantLinkEnabled: (linkId: string, enabled: boolean) => Promise<void>;
  setSearchTerm: (searchTerm: string) => void;
  sourceAttribution: string;
  stores: StoreSummary[];
  total: number;
};

export function useStores(initialCity = "Kyiv"): StoresState {
  const { locationProvider, merchantLinkRepository, storeRepository } = useDependencies();
  const [city, setCity] = useState(initialCity);
  const [lastMode, setLastMode] = useState<"city" | "nearby">("city");
  const [searchTerm, setSearchTerm] = useState("");
  const [allStores, setAllStores] = useState<StoreSummary[]>([]);
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [cardMerchants, setCardMerchants] = useState<CardMerchant[]>([]);
  const [merchantLinks, setMerchantLinks] = useState<MerchantLink[]>([]);
  const [nearbySuggestions, setNearbySuggestions] = useState<NearbySuggestion[]>([]);
  const [nearbyOutcomes, setNearbyOutcomes] = useState<NearbySuggestionOutcome[]>([]);
  const requestGeneration = useRef(0);

  const stores = useMemo(() => filterStores(allStores, searchTerm), [allStores, searchTerm]);

  const loadMerchantState = useCallback(
    async (
      nearbyStores: readonly StoreSummary[] = [],
      assessmentOverride?: NearbySuggestionAssessment
    ) => {
      await merchantLinkRepository.ensureCardMerchants();
      const [merchants, links, dismissals] = await Promise.all([
        merchantLinkRepository.listCardMerchants(),
        merchantLinkRepository.listLinks(),
        merchantLinkRepository.listDismissals()
      ]);
      setCardMerchants(merchants);
      setMerchantLinks(links);

      if (assessmentOverride) {
        setNearbySuggestions(assessmentOverride.suggestions);
        setNearbyOutcomes(assessmentOverride.outcomes);
      } else if (nearbyStores.length > 0) {
        const assessment = assessNearbySuggestions({
          dismissals,
          links,
          merchants,
          stores: nearbyStores
        });
        setNearbySuggestions(assessment.suggestions);
        setNearbyOutcomes(assessment.outcomes);
      }
    },
    [merchantLinkRepository]
  );

  const loadCity = useCallback(
    async (nextCity: string) => {
      const generation = ++requestGeneration.current;
      setIsUsingLocation(false);
      setIsLoading(true);
      setError(null);
      setNearbySuggestions([]);
      setNearbyOutcomes([]);

      try {
        const result = await storeRepository.search({
          origin: { city: nextCity, kind: "city" }
        });

        if (generation !== requestGeneration.current) {
          return;
        }

        setAllStores(result.stores);
        setSourceAttribution(result.sourceAttribution);
        setLastMode("city");
      } catch (loadError) {
        if (generation !== requestGeneration.current) {
          return;
        }

        setError(toUnknownAppError(loadError));
        setAllStores([]);
      } finally {
        if (generation === requestGeneration.current) {
          setIsLoading(false);
        }
      }
    },
    [storeRepository]
  );

  const searchCity = useCallback(async () => {
    const nextCity = city.trim();

    if (!nextCity) {
      setError({ field: "city", kind: "validation", message: "Enter a city to search stores." });
      return;
    }

    await loadCity(nextCity);
  }, [city, loadCity]);

  const requestCurrentLocation = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setIsUsingLocation(true);
    setIsLoading(true);
    setError(null);

    const result = await runNearbySuggestionLookup({
      isCanceled: () => generation !== requestGeneration.current,
      locationProvider,
      merchantLinkRepository,
      storeRepository
    });

    if (generation !== requestGeneration.current || result.terminalOutcome?.kind === "canceled") {
      return;
    }

    setNearbySuggestions(result.assessment.suggestions);
    setNearbyOutcomes(result.assessment.outcomes);
    setLastMode("nearby");

    if (result.searchResult) {
      setAllStores(result.searchResult.stores);
      setSourceAttribution(result.searchResult.sourceAttribution);

      try {
        await loadMerchantState(result.searchResult.stores, result.assessment);
      } catch (storageError) {
        setError(toUnknownAppError(storageError));
      }
    } else {
      setError(appErrorForOutcome(result.terminalOutcome));
    }

    setIsUsingLocation(false);
    setIsLoading(false);
  }, [loadMerchantState, locationProvider, merchantLinkRepository, storeRepository]);

  const refresh = useCallback(async () => {
    if (lastMode === "nearby") {
      await requestCurrentLocation();
      return;
    }

    await searchCity();
  }, [lastMode, requestCurrentLocation, searchCity]);

  const refreshAfterMerchantMutation = useCallback(async () => {
    try {
      await loadMerchantState(lastMode === "nearby" ? allStores : []);
      setError(null);
    } catch (mutationError) {
      setError(toUnknownAppError(mutationError));
      setNearbyOutcomes((current) => [...current, { kind: "storageFailure" }]);
    }
  }, [allStores, lastMode, loadMerchantState]);

  const confirmSuggestion = useCallback(
    async (store: StoreSummary, merchantKey: string) => {
      const merchant = cardMerchants.find((candidate) => candidate.merchantKey === merchantKey);
      const sourceReference = parseStoreSourceReference(store);

      if (!merchant || !sourceReference) {
        setError({ kind: "validation", message: "Choose a saved card before confirming this suggestion." });
        return;
      }

      try {
        await merchantLinkRepository.confirm({
          aliases: [...merchant.aliases, store.name],
          displayName: merchant.displayName,
          merchantKey,
          sourceReference
        });
        await refreshAfterMerchantMutation();
      } catch (confirmError) {
        setError(toUnknownAppError(confirmError));
      }
    },
    [cardMerchants, merchantLinkRepository, refreshAfterMerchantMutation]
  );

  const dismissSuggestion = useCallback(
    async (store: StoreSummary, merchantKey: string) => {
      const sourceReference = parseStoreSourceReference(store);

      if (!sourceReference) {
        return;
      }

      try {
        await merchantLinkRepository.dismiss({ merchantKey, sourceReference });
        await refreshAfterMerchantMutation();
      } catch (dismissError) {
        setError(toUnknownAppError(dismissError));
      }
    },
    [merchantLinkRepository, refreshAfterMerchantMutation]
  );

  const correctMerchantLink = useCallback(
    async (linkId: string, merchantKey: string) => {
      const merchant = cardMerchants.find((candidate) => candidate.merchantKey === merchantKey);

      if (!merchant) {
        setError({ kind: "validation", message: "Choose a saved card before correcting this link." });
        return;
      }

      try {
        await merchantLinkRepository.correct(linkId, {
          aliases: merchant.aliases,
          displayName: merchant.displayName,
          merchantKey
        });
        await refreshAfterMerchantMutation();
      } catch (correctionError) {
        setError(toUnknownAppError(correctionError));
      }
    },
    [cardMerchants, merchantLinkRepository, refreshAfterMerchantMutation]
  );

  const repairSuggestion = useCallback(
    async (linkId: string, store: StoreSummary) => {
      const sourceReference = parseStoreSourceReference(store);

      if (!sourceReference) {
        return;
      }

      try {
        await merchantLinkRepository.repairSource(linkId, sourceReference);
        await refreshAfterMerchantMutation();
      } catch (repairError) {
        setError(toUnknownAppError(repairError));
      }
    },
    [merchantLinkRepository, refreshAfterMerchantMutation]
  );

  const setMerchantLinkEnabled = useCallback(
    async (linkId: string, enabled: boolean) => {
      try {
        await merchantLinkRepository.setEnabled(linkId, enabled);
        await refreshAfterMerchantMutation();
      } catch (enableError) {
        setError(toUnknownAppError(enableError));
      }
    },
    [merchantLinkRepository, refreshAfterMerchantMutation]
  );

  const removeMerchantLink = useCallback(
    async (linkId: string) => {
      try {
        await merchantLinkRepository.remove(linkId);
        await refreshAfterMerchantMutation();
      } catch (removeError) {
        setError(toUnknownAppError(removeError));
      }
    },
    [merchantLinkRepository, refreshAfterMerchantMutation]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCity(initialCity);
      void loadMerchantState().catch((loadError) => setError(toUnknownAppError(loadError)));
    }, 0);

    return () => {
      clearTimeout(timer);
      requestGeneration.current += 1;
    };
  }, [initialCity, loadCity, loadMerchantState]);

  return {
    cardMerchants,
    city,
    confirmSuggestion,
    correctMerchantLink,
    dismissSuggestion,
    error,
    isLoading,
    isUsingLocation,
    merchantLinks,
    nearbyOutcomes,
    nearbySuggestions,
    refresh,
    removeMerchantLink,
    repairSuggestion,
    requestCurrentLocation,
    searchCity,
    searchTerm,
    setCity,
    setMerchantLinkEnabled,
    setSearchTerm,
    sourceAttribution,
    stores,
    total: stores.length
  };
}

function filterStores(stores: readonly StoreSummary[], searchTerm: string): StoreSummary[] {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return [...stores];
  }

  return stores.filter((store) =>
    [store.name, store.category, store.address, store.brand, store.operator].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch)
    )
  );
}

function appErrorForOutcome(outcome: NearbySuggestionOutcome | undefined): AppError | null {
  switch (outcome?.kind) {
    case "permissionDenied":
      return {
        kind: "permission",
        message: "Location access is needed for Near Me. City search and saved cards remain available.",
        permission: "location"
      };
    case "locationUnavailable":
      return { kind: "unknown", message: "Current location is unavailable. Try again or search by city." };
    case "networkFailure":
      return {
        kind: "network",
        message: "Nearby stores could not be loaded. Saved cards and checkout remain available.",
        retryable: outcome.retryable
      };
    case "storageFailure":
      return { kind: "storage", message: "Merchant links could not be loaded. Saved cards remain available." };
    default:
      return null;
  }
}
