import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { StoreSummary } from "@/domain/stores/StoreRepository";

type StoreDetailsState = {
  error: AppError | null;
  isLoading: boolean;
  store: StoreSummary | null;
};

export function useStoreDetails(storeId: string) {
  const { errorReporter, storeRepository } = useDependencies();
  const [state, setState] = useState<StoreDetailsState>({
    error: null,
    isLoading: true,
    store: null
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const store = await storeRepository.getCachedById(storeId);
      setState({ error: null, isLoading: false, store });
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);
      setState({ error: appError, isLoading: false, store: null });
    }
  }, [errorReporter, storeId, storeRepository]);

  useEffect(() => {
    let isMounted = true;

    async function loadStore() {
      try {
        const store = await storeRepository.getCachedById(storeId);

        if (isMounted) {
          setState({ error: null, isLoading: false, store });
        }
      } catch (error) {
        const appError = toUnknownAppError(error);
        errorReporter.report(appError);

        if (isMounted) {
          setState({ error: appError, isLoading: false, store: null });
        }
      }
    }

    void loadStore();

    return () => {
      isMounted = false;
    };
  }, [errorReporter, storeId, storeRepository]);

  return {
    ...state,
    refresh
  };
}
