import { useCallback, useEffect, useRef, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isBackupError, type BackupRestoreCandidate, type BackupRestoreResult } from "@/domain/backup/Backup";
import type { DuplicateImportStrategy } from "@/domain/sharing/SharingPorts";

export function useBackupRestoreController() {
  const { backupService, localAuthService, localSecuritySettingsStore, interactionFeedback, localDiagnosticsService } =
    useDependencies();
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [candidate, setCandidate] = useState<BackupRestoreCandidate | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateImportStrategy>("skip");
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult | null>(null);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const candidateRef = useRef<BackupRestoreCandidate | null>(null);

  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  useEffect(
    () => () => {
      void candidateRef.current?.source.cleanup();
    },
    []
  );

  const exportBackup = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    if (passphrase.length < 8 || passphrase !== confirmation) {
      setError("Enter the same backup passphrase twice. It must contain at least 8 characters.");
      interactionFeedback.warning();
      return;
    }

    setBusy(true);
    try {
      const settings = await localSecuritySettingsStore.get();
      if (settings.enabled) {
        const auth = await localAuthService.authenticate("sensitiveAction");
        if (auth.status !== "authenticated") {
          setError("Authentication is required before exporting the full wallet.");
          localDiagnosticsService.record({
            code: "backup_export_auth_failed",
            component: "account.backup",
            level: "warning",
            metadata: { reason: auth.reason }
          });
          return;
        }
      }

      const result = await backupService.createBackup(passphrase);
      setStatus(`Created encrypted backup with ${result.cardCount} cards and ${result.imageCount} images.`);
      localDiagnosticsService.record({
        code: "backup_export_completed",
        component: "account.backup",
        level: "info",
        metadata: { cardCount: result.cardCount, imageCount: result.imageCount }
      });
      interactionFeedback.success();
    } catch (value) {
      const message = isBackupError(value) ? value.message : "Encrypted backup could not be created.";
      setError(message);
      localDiagnosticsService.record({
        code: "backup_export_failed",
        component: "account.backup",
        level: "error",
        metadata: { reason: isBackupError(value) ? value.reason : "unknown" }
      });
      interactionFeedback.error();
    } finally {
      setBusy(false);
    }
  }, [
    backupService,
    confirmation,
    interactionFeedback,
    localAuthService,
    localDiagnosticsService,
    localSecuritySettingsStore,
    passphrase
  ]);

  const previewRestore = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    setRestoreResult(null);
    try {
      await candidate?.source.cleanup();
      const next = await backupService.selectAndPreviewRestore(passphrase);
      setCandidate(next);
      setStatus("Backup authenticated. Review the preview before restoring.");
      interactionFeedback.selectionChanged();
    } catch (value) {
      setCandidate(null);
      setError(isBackupError(value) ? value.message : "Backup could not be previewed.");
      interactionFeedback.error();
    } finally {
      setBusy(false);
    }
  }, [backupService, candidate, interactionFeedback, passphrase]);

  const restore = useCallback(async () => {
    if (!candidate) {
      setError("Preview and authenticate a backup before restoring it.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await backupService.restore(candidate, passphrase, { duplicateStrategy });
      setRestoreResult(result);
      setCandidate(null);
      setStatus(
        `Restore finished: ${result.importedCardCount} imported, ${result.skippedCardCount} skipped, ${result.failedCardCount} failed.`
      );
      interactionFeedback.success();
    } catch (value) {
      setError(isBackupError(value) ? value.message : "Backup restore failed before card writes.");
      interactionFeedback.error();
    } finally {
      setBusy(false);
    }
  }, [backupService, candidate, duplicateStrategy, interactionFeedback, passphrase]);

  return {
    busy,
    candidate,
    confirmation,
    duplicateStrategy,
    error,
    passphrase,
    restoreResult,
    status,
    setConfirmation,
    setDuplicateStrategy,
    setPassphrase,
    exportBackup,
    previewRestore,
    restore
  };
}
