import { useCallback, useEffect, useState } from "react";

import { Screen } from "@/components/ui/Screen";
import { ReceivedCardSharePreviewView } from "@/components/views/ReceivedCardSharePreviewView";
import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type {
  ExportBundle,
  ImportBundlePreview
} from "@/domain/sharing/SharingPorts";
import { decodeCardSharePayload } from "@/domain/sharing/cardShareLink";

type ReceivedCardShareScreenProps = {
  encodedPayload?: string;
  onClose: () => void;
  onSaved: (cardId: string) => void;
};

type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; bundle: ExportBundle; preview: ImportBundlePreview }
  | { kind: "error"; error: AppError };

export function ReceivedCardShareScreen({
  encodedPayload,
  onClose,
  onSaved
}: ReceivedCardShareScreenProps) {
  const { interactionFeedback, sharingService } = useDependencies();
  const [state, setState] = useState<PreviewState>({ kind: "loading" });
  const [importError, setImportError] = useState<AppError | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setState({ kind: "loading" });
      setImportError(null);

      if (!encodedPayload) {
        setState({
          kind: "error",
          error: {
            kind: "validation",
            field: "payload",
            message: "This share link is missing its card data."
          }
        });
        interactionFeedback.warning();
        return;
      }

      try {
        const payload = decodeCardSharePayload(encodedPayload);
        const preview = await sharingService.previewImportBundle(payload.bundle);

        if (isMounted) {
          setState({ kind: "ready", bundle: payload.bundle, preview });
        }
      } catch (error) {
        if (isMounted) {
          setState({ kind: "error", error: toUnknownAppError(error) });
          interactionFeedback.warning();
        }
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [encodedPayload, interactionFeedback, sharingService]);

  const handleSave = useCallback(async () => {
    if (state.kind !== "ready") {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await sharingService.importBundle(state.bundle, { duplicateStrategy: "keepBoth" });

      if (result.failedCardCount > 0 || result.importedCardCount < 1) {
        const message =
          result.errors.length > 0
            ? result.errors.join(" ")
            : "The shared card could not be saved on this device.";
        setImportError({ kind: "importExport", message });
        interactionFeedback.error();
        return;
      }

      const importedCardId = result.importedCardIds?.[0];

      interactionFeedback.success();

      if (importedCardId) {
        onSaved(importedCardId);
      } else {
        onClose();
      }
    } catch (error) {
      setImportError(toUnknownAppError(error));
      interactionFeedback.error();
    } finally {
      setIsImporting(false);
    }
  }, [interactionFeedback, onClose, onSaved, sharingService, state]);

  return (
    <Screen contentContainerStyle={{ justifyContent: "center" }}>
      <ReceivedCardSharePreviewView
        errorMessage={state.kind === "error" ? state.error.message : importError?.message}
        isImporting={isImporting}
        onCancel={onClose}
        onSave={() => void handleSave()}
        preview={state.kind === "ready" ? state.preview : undefined}
        sharedCard={state.kind === "ready" ? state.bundle.cards[0] : undefined}
        status={state.kind}
      />
    </Screen>
  );
}
