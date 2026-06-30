import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { BarcodeFormat } from "@/domain/cards/Card";
import type { ImportDraft, ImportSession } from "@/domain/importing/ImportSession";

import {
  commitImportDrafts,
  createImportSessionFromScans,
  reviewImportDraft
} from "../bulkImportWorkflow";

type BulkImportState = {
  drafts: ImportDraft[];
  error: AppError | null;
  isBusy: boolean;
  session: ImportSession | null;
};

export function useBulkImport() {
  const dependencies = useDependencies();
  const [state, setState] = useState<BulkImportState>({
    drafts: [],
    error: null,
    isBusy: true,
    session: null
  });

  const reload = useCallback(async (session: ImportSession | null) => {
    const drafts = session ? await dependencies.importSessionRepository.listDrafts(session.id) : [];
    setState({ drafts, error: null, isBusy: false, session });
  }, [dependencies.importSessionRepository]);

  useEffect(() => {
    void dependencies.importSessionRepository
      .getActive()
      .then(reload)
      .catch((error) => {
        setState((current) => ({
          ...current,
          error: isAppError(error) ? error : toUnknownAppError(error),
          isBusy: false
        }));
      });
  }, [dependencies.importSessionRepository, reload]);

  const choosePhotos = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isBusy: true }));

    try {
      const permission = await dependencies.scannerService.requestPhotoPermission();

      if (permission.status !== "granted") {
        throw {
          kind: "permission",
          permission: "photos",
          message: "Photo access is needed to import screenshots."
        } satisfies AppError;
      }

      const scanResult = await dependencies.scannerService.scanMultipleFromPhotoLibrary();

      if (scanResult.status === "canceled") {
        setState((current) => ({ ...current, isBusy: false }));
        return;
      }

      if (state.session?.status === "active") {
        await dependencies.importSessionRepository.setStatus(state.session.id, "canceled");
      }

      const session = await createImportSessionFromScans(dependencies, scanResult.items);
      await reload(session);
    } catch (error) {
      const appError = isAppError(error) ? error : toUnknownAppError(error);
      dependencies.errorReporter.report(appError);
      setState((current) => ({ ...current, error: appError, isBusy: false }));
    }
  }, [dependencies, reload, state.session]);

  const updateDraft = useCallback(async (
    draft: ImportDraft,
    values: { barcodeFormat?: BarcodeFormat; cardNumber?: string; storeName?: string }
  ) => {
    setState((current) => ({ ...current, error: null, isBusy: true }));
    try {
      await reviewImportDraft(dependencies, draft, {
        barcodeFormat: values.barcodeFormat ?? draft.barcodeFormat,
        cardNumber: values.cardNumber ?? draft.cardNumber,
        storeName: values.storeName ?? draft.storeName
      });
      await reload(state.session);
    } catch (error) {
      const appError = isAppError(error) ? error : toUnknownAppError(error);
      setState((current) => ({ ...current, error: appError, isBusy: false }));
    }
  }, [dependencies, reload, state.session]);

  const commit = useCallback(async (includeDuplicates: boolean) => {
    if (!state.session) {
      return [];
    }

    setState((current) => ({ ...current, error: null, isBusy: true }));
    const results = await commitImportDrafts(dependencies, state.drafts, includeDuplicates);
    const remaining = (await dependencies.importSessionRepository.listDrafts(state.session.id)).filter(
      (draft) => draft.status !== "imported"
    );

    if (remaining.length === 0) {
      await dependencies.importSessionRepository.setStatus(state.session.id, "completed");
      await reload(null);
    } else {
      await reload(state.session);
    }

    return results;
  }, [dependencies, reload, state.drafts, state.session]);

  const cancel = useCallback(async () => {
    if (state.session) {
      await dependencies.importSessionRepository.setStatus(state.session.id, "canceled");
    }
    await reload(null);
  }, [dependencies.importSessionRepository, reload, state.session]);

  return { ...state, cancel, choosePhotos, commit, reload: () => reload(state.session), updateDraft };
}
