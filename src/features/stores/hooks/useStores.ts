import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { StoreSearchOrigin, StoreSummary } from "@/domain/stores/StoreRepository";

export type StoresState = {
  city: string;
  error: AppError | null;
  isLoading: boolean;
  isUsingLocation: boolean;
  searchTerm: string;
  setCity: (city: string) => void;
  setSearchTerm: (searchTerm: string) => void;
  sourceAttribution: string;
  stores: StoreSummary[];
  total: number;
  refresh: () => Promise<void>;
  requestCurrentLocation: () => Promise<void>;
  searchCity: () => Promise<void>;
};

export function useStores(initialCity = "Kyiv"): StoresState {
  const { locationProvider, storeRepository } = useDependencies();
  const [city, setCityValue] = useState(initialCity);
  const [origin, setOrigin] = useState<StoreSearchOrigin>({ city: initialCity, kind: "city" });
  const [searchTerm, setSearchTermValue] = useState("");
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const loadStores = useCallback(
    async (nextOrigin: StoreSearchOrigin, nextSearchTerm: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await storeRepository.search({
          origin: nextOrigin,
          searchTerm: nextSearchTerm
        });

        setStores(result.stores);
        setTotal(result.total);
        setSourceAttribution(result.sourceAttribution);
      } catch (loadError) {
        setError(toUnknownAppError(loadError));
        setStores([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [storeRepository]
  );

  const refresh = useCallback(async () => {
    await loadStores(origin, searchTerm);
  }, [loadStores, origin, searchTerm]);

  const searchCity = useCallback(async () => {
    const nextCity = city.trim();

    if (!nextCity) {
      setError({ field: "city", kind: "validation", message: "Enter a city to search stores." });
      return;
    }

    const nextOrigin: StoreSearchOrigin = { city: nextCity, kind: "city" };
    setOrigin(nextOrigin);
    await loadStores(nextOrigin, searchTerm);
  }, [city, loadStores, searchTerm]);

  const requestCurrentLocation = useCallback(async () => {
    setIsUsingLocation(true);
    setError(null);

    try {
      const location = await locationProvider.getCurrentLocation();
      const nextOrigin: StoreSearchOrigin = {
        kind: "nearby",
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: 2500
      };

      setOrigin(nextOrigin);
      await loadStores(nextOrigin, searchTerm);
    } catch (locationError) {
      setError(toUnknownAppError(locationError));
    } finally {
      setIsUsingLocation(false);
    }
  }, [loadStores, locationProvider, searchTerm]);

  const setCity = useCallback((nextCity: string) => {
    setCityValue(nextCity);
  }, []);

  const setSearchTerm = useCallback(
    (nextSearchTerm: string) => {
      setSearchTermValue(nextSearchTerm);
      void loadStores(origin, nextSearchTerm);
    },
    [loadStores, origin]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInitialStores() {
      try {
        const result = await storeRepository.search({
          origin: { city: initialCity, kind: "city" },
          searchTerm: ""
        });

        if (isMounted) {
          setStores(result.stores);
          setTotal(result.total);
          setSourceAttribution(result.sourceAttribution);
          setError(null);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(toUnknownAppError(loadError));
          setStores([]);
          setTotal(0);
          setIsLoading(false);
        }
      }
    }

    void loadInitialStores();

    return () => {
      isMounted = false;
    };
  }, [initialCity, storeRepository]);

  return {
    city,
    error,
    isLoading,
    isUsingLocation,
    searchTerm,
    setCity,
    setSearchTerm,
    sourceAttribution,
    stores,
    total,
    refresh,
    requestCurrentLocation,
    searchCity,
  };
}
