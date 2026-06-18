import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { AccountLocalSummaryView } from "@/components/views/AccountLocalSummaryView";
import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type {
  DuplicateImportStrategy,
  ImportBundlePreview
} from "@/domain/sharing/SharingPorts";

function formatExportDetail(cardCount: number, createdAt: string): string {
  return `${cardCount} card${cardCount === 1 ? "" : "s"} on ${new Date(createdAt).toLocaleString()}`;
}

function parseBundleText(text: string): unknown | AppError {
  try {
    return JSON.parse(text);
  } catch {
    return {
      kind: "validation",
      field: "importBundle",
      message: "Import bundle must be valid JSON."
    };
  }
}

export function AccountScreen() {
  const {
    appInfoProvider,
    cardRepository,
    imageStore,
    interactionFeedback,
    sharingService,
    textShareService
  } = useDependencies();
  const appInfo = useMemo(() => appInfoProvider.getAppInfo(), [appInfoProvider]);
  const [cardCount, setCardCount] = useState(0);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateImportStrategy>("skip");
  const [error, setError] = useState<AppError | null>(null);
  const [exportBundleText, setExportBundleText] = useState("");
  const [importBundleText, setImportBundleText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportBundlePreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [lastExportDetail, setLastExportDetail] = useState("No exports yet");
  const [maintenanceDetail, setMaintenanceDetail] = useState("No maintenance actions have run yet.");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();

  const loadSummary = useCallback(async () => {
    try {
      const [cards, summary] = await Promise.all([
        cardRepository.list(),
        sharingService.getLastExportSummary()
      ]);

      setError(null);
      setCardCount(cards.length);
      setLastExportDetail(summary ? formatExportDetail(summary.cardCount, summary.createdAt) : "No exports yet");
    } catch (summaryError) {
      setError(toUnknownAppError(summaryError));
    }
  }, [cardRepository, sharingService]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSummary() {
      try {
        const [cards, summary] = await Promise.all([
          cardRepository.list(),
          sharingService.getLastExportSummary()
        ]);

        if (isMounted) {
          setError(null);
          setCardCount(cards.length);
          setLastExportDetail(summary ? formatExportDetail(summary.cardCount, summary.createdAt) : "No exports yet");
        }
      } catch (summaryError) {
        if (isMounted) {
          setError(toUnknownAppError(summaryError));
        }
      }
    }

    void loadInitialSummary();

    return () => {
      isMounted = false;
    };
  }, [cardRepository, sharingService]);

  const previewImportBundle = useCallback(async (): Promise<ImportBundlePreview | null> => {
    setError(null);
    setStatusMessage(undefined);

    const parsedBundle = parseBundleText(importBundleText);

    if (isAppError(parsedBundle)) {
      setImportPreview(null);
      setError(parsedBundle);
      interactionFeedback.warning();
      return null;
    }

    try {
      const preview = await sharingService.previewImportBundle(parsedBundle);
      setImportPreview(preview);
      setStatusMessage(
        `Ready to import ${preview.cardCount} card${preview.cardCount === 1 ? "" : "s"}.`
      );
      interactionFeedback.selectionChanged();
      return preview;
    } catch (previewError) {
      const appError = toUnknownAppError(previewError);
      setImportPreview(null);
      setError(appError);
      interactionFeedback.error();
      return null;
    }
  }, [importBundleText, interactionFeedback, sharingService]);

  const performExport = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    setStatusMessage(undefined);

    try {
      const bundle = await sharingService.exportCards({ includeImages: true });
      setExportBundleText(JSON.stringify(bundle, null, 2));
      setLastExportDetail(formatExportDetail(bundle.cards.length, bundle.exportedAt));
      setStatusMessage(`Exported ${bundle.cards.length} card${bundle.cards.length === 1 ? "" : "s"}.`);
      interactionFeedback.success();
      await loadSummary();
    } catch (exportError) {
      setError(toUnknownAppError(exportError));
      interactionFeedback.error();
    } finally {
      setIsBusy(false);
    }
  }, [interactionFeedback, loadSummary, sharingService]);

  const handleExportAll = useCallback(() => {
    Alert.alert(
      "Export all cards?",
      "The bundle includes loyalty card numbers and private card images. Share or store it carefully.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => void performExport() }
      ]
    );
  }, [performExport]);

  const handleShareExportBundle = useCallback(async () => {
    if (!exportBundleText) {
      return;
    }

    setError(null);
    setStatusMessage(undefined);

    try {
      const shared = await textShareService.shareText({
        message: exportBundleText,
        title: "Loyalty Card Wallet export"
      });

      if (shared) {
        setStatusMessage("Export bundle shared.");
        interactionFeedback.success();
      } else {
        setStatusMessage("Share canceled.");
        interactionFeedback.selectionChanged();
      }
    } catch (shareError) {
      setError(toUnknownAppError(shareError));
      interactionFeedback.error();
    }
  }, [exportBundleText, interactionFeedback, textShareService]);

  const performImport = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    setStatusMessage(undefined);

    const parsedBundle = parseBundleText(importBundleText);

    if (isAppError(parsedBundle)) {
      setError(parsedBundle);
      setIsBusy(false);
      interactionFeedback.warning();
      return;
    }

    try {
      const result = await sharingService.importBundle(parsedBundle, { duplicateStrategy });
      setStatusMessage(
        `Imported ${result.importedCardCount}, skipped ${result.skippedCardCount}, failed ${result.failedCardCount}.`
      );
      if (result.failedCardCount > 0 || result.errors.length > 0) {
        interactionFeedback.warning();
      } else {
        interactionFeedback.success();
      }
      setImportPreview(null);
      await loadSummary();

      if (result.errors.length > 0) {
        setError({
          kind: "importExport",
          message: result.errors.join(" ")
        });
      }
    } catch (importError) {
      setError(toUnknownAppError(importError));
      interactionFeedback.error();
    } finally {
      setIsBusy(false);
    }
  }, [duplicateStrategy, importBundleText, interactionFeedback, loadSummary, sharingService]);

  const handleImportBundle = useCallback(async () => {
    const preview = importPreview ?? (await previewImportBundle());

    if (!preview) {
      return;
    }

    Alert.alert(
      "Import cards?",
      `${preview.cardCount} cards will be imported with duplicate strategy: ${duplicateStrategy}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import", onPress: () => void performImport() }
      ]
    );
  }, [duplicateStrategy, importPreview, performImport, previewImportBundle]);

  const handleCleanUnusedImages = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    setStatusMessage(undefined);

    try {
      const deletedCount = await imageStore.deleteUnreferencedPayloads();
      setMaintenanceDetail(
        `Cleaned ${deletedCount} unused private image payload${deletedCount === 1 ? "" : "s"}.`
      );
      interactionFeedback.success();
    } catch (maintenanceError) {
      setError(toUnknownAppError(maintenanceError));
      interactionFeedback.error();
    } finally {
      setIsBusy(false);
    }
  }, [imageStore, interactionFeedback]);

  const handleChangeImportBundleText = useCallback((text: string) => {
    setImportBundleText(text);
    setImportPreview(null);
  }, []);

  const handleClearImportBundle = useCallback(() => {
    setImportBundleText("");
    setImportPreview(null);
    setStatusMessage(undefined);
    interactionFeedback.selectionChanged();
  }, [interactionFeedback]);

  const handleChangeDuplicateStrategy = useCallback(
    (strategy: DuplicateImportStrategy) => {
      setDuplicateStrategy(strategy);
      interactionFeedback.selectionChanged();
    },
    [interactionFeedback]
  );

  return (
    <Screen>
      <AccountLocalSummaryView
        appName={appInfo.name}
        appVersion={appInfo.version}
        cardCount={cardCount}
        duplicateStrategy={duplicateStrategy}
        errorMessage={error?.message}
        exportBundleText={exportBundleText}
        importBundleText={importBundleText}
        importPreview={importPreview}
        isBusy={isBusy}
        lastExportDetail={lastExportDetail}
        maintenanceDetail={maintenanceDetail}
        onChangeDuplicateStrategy={handleChangeDuplicateStrategy}
        onChangeImportBundleText={handleChangeImportBundleText}
        onClearImportBundle={handleClearImportBundle}
        onCleanUnusedImages={() => void handleCleanUnusedImages()}
        onExportAll={handleExportAll}
        onImportBundle={() => void handleImportBundle()}
        onPreviewImport={() => void previewImportBundle()}
        onRefreshSummary={() => void loadSummary()}
        onShareExportBundle={() => void handleShareExportBundle()}
        statusMessage={statusMessage}
      />
    </Screen>
  );
}
