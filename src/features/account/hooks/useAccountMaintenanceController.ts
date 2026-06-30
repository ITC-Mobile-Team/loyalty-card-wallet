import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, type AppError } from "@/core/errors/AppError";
import type { DuplicateImportStrategy, ImportBundlePreview } from "@/domain/sharing/SharingPorts";

function parseBundle(text: string): unknown | AppError {
  try {
    return JSON.parse(text);
  } catch {
    return { kind: "validation", field: "importBundle", message: "Legacy bundle must be valid JSON." };
  }
}

export function useAccountMaintenanceController() {
  const { cardRepository, imageStore, interactionFeedback, sharingService, textShareService } = useDependencies();
  const [cardCount, setCardCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [legacyText, setLegacyText] = useState("");
  const [legacyPreview, setLegacyPreview] = useState<ImportBundlePreview | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateImportStrategy>("skip");

  const refresh = useCallback(async () => {
    const cards = await cardRepository.list();
    setCardCount(cards.length);
  }, [cardRepository]);

  useEffect(() => {
    let mounted = true;
    async function loadCardCount() {
      const cards = await cardRepository.list();
      if (mounted) setCardCount(cards.length);
    }
    void loadCardCount();
    return () => {
      mounted = false;
    };
  }, [cardRepository]);

  const cleanImages = useCallback(async () => {
    setBusy(true);
    try {
      const count = await imageStore.deleteUnreferencedPayloads();
      setMessage(`Cleaned ${count} unused private image payload${count === 1 ? "" : "s"}.`);
      interactionFeedback.success();
    } finally {
      setBusy(false);
    }
  }, [imageStore, interactionFeedback]);

  const exportLegacy = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    try {
      const bundle = await sharingService.exportCards({ includeImages: true });
      const shared = await textShareService.shareText({
        title: "Legacy Loyalty Card Wallet JSON export",
        message: JSON.stringify(bundle)
      });
      setMessage(shared ? "Legacy plaintext JSON shared." : "Legacy export canceled.");
    } catch {
      setError("Legacy plaintext export failed.");
    } finally {
      setBusy(false);
    }
  }, [sharingService, textShareService]);

  const previewLegacy = useCallback(async () => {
    const parsed = parseBundle(legacyText);
    if (isAppError(parsed)) {
      setError(parsed.message);
      setLegacyPreview(null);
      return;
    }
    try {
      setLegacyPreview(await sharingService.previewImportBundle(parsed));
      setError(undefined);
    } catch {
      setError("Legacy plaintext bundle could not be previewed.");
      setLegacyPreview(null);
    }
  }, [legacyText, sharingService]);

  const importLegacy = useCallback(async () => {
    const parsed = parseBundle(legacyText);
    if (isAppError(parsed)) {
      setError(parsed.message);
      return;
    }
    setBusy(true);
    try {
      const result = await sharingService.importBundle(parsed, { duplicateStrategy });
      setMessage(
        `Legacy import: ${result.importedCardCount} imported, ${result.skippedCardCount} skipped, ${result.failedCardCount} failed.`
      );
      setLegacyPreview(null);
      await refresh();
    } catch {
      setError("Legacy plaintext import failed.");
    } finally {
      setBusy(false);
    }
  }, [duplicateStrategy, legacyText, refresh, sharingService]);

  return {
    busy,
    cardCount,
    duplicateStrategy,
    error,
    legacyPreview,
    legacyText,
    message,
    setDuplicateStrategy,
    setLegacyText: (value: string) => {
      setLegacyText(value);
      setLegacyPreview(null);
    },
    cleanImages,
    exportLegacy,
    importLegacy,
    previewLegacy,
    refresh
  };
}
