import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { LoyaltyCard } from "@/domain/cards/Card";

type ExternalCardSelectionState = {
  available: boolean;
  error: AppError | null;
  isSelected: boolean;
  isUpdating: boolean;
  statusMessage: string | null;
};

export function useExternalCardSelection(card: LoyaltyCard | null) {
  const {
    errorReporter,
    externalSnapshotRepository,
    localAuthService,
    localSecuritySettingsStore
  } = useDependencies();
  const [state, setState] = useState<ExternalCardSelectionState>({
    available: externalSnapshotRepository.isAvailable(),
    error: null,
    isSelected: false,
    isUpdating: false,
    statusMessage: null
  });

  const refresh = useCallback(async () => {
    if (!card || !externalSnapshotRepository.isAvailable()) return;
    const isSelected = await externalSnapshotRepository.isSelected(card.id);
    setState((current) => ({ ...current, isSelected }));
  }, [card, externalSnapshotRepository]);

  useEffect(() => {
    let mounted = true;
    async function loadSelection() {
      if (!card || !externalSnapshotRepository.isAvailable()) return;
      const isSelected = await externalSnapshotRepository.isSelected(card.id);
      if (mounted) {
        setState((current) => ({ ...current, isSelected }));
      }
    }
    void loadSelection();
    return () => {
      mounted = false;
    };
  }, [card, externalSnapshotRepository]);

  const toggle = useCallback(async () => {
    if (!card || !externalSnapshotRepository.isAvailable()) return;
    setState((current) => ({ ...current, error: null, isUpdating: true, statusMessage: null }));

    try {
      const settings = await localSecuritySettingsStore.get();
      if (settings.enabled) {
        const authentication = await localAuthService.authenticate("sensitiveAction");
        if (authentication.status !== "authenticated") {
          throw {
            kind: "authentication",
            reason: authentication.reason,
            retryable: authentication.retryable,
            message: "Authentication is required to change widget access."
          } satisfies AppError;
        }
      }

      if (state.isSelected) {
        await externalSnapshotRepository.revoke(card.id);
        setState((current) => ({
          ...current,
          error: null,
          isSelected: false,
          isUpdating: false,
          statusMessage: "Card removed from external widgets."
        }));
      } else {
        await externalSnapshotRepository.select(card);
        setState((current) => ({
          ...current,
          error: null,
          isSelected: true,
          isUpdating: false,
          statusMessage: "Card is available to external widgets."
        }));
      }
    } catch (error) {
      const appError = isAppError(error) ? error : toUnknownAppError(error);
      errorReporter.report(appError);
      setState((current) => ({ ...current, error: appError, isUpdating: false }));
    }
  }, [
    card,
    errorReporter,
    externalSnapshotRepository,
    localAuthService,
    localSecuritySettingsStore,
    state.isSelected
  ]);

  return {
    ...state,
    refresh,
    toggle
  };
}
