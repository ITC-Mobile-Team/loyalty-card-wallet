import { useState } from "react";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { AddCardFormView, type AddCardFormValues } from "@/components/views/AddCardFormView";
import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import { colors, spacing } from "@/design/tokens";
import { normalizeScanResult } from "@/domain/scanner/ScanResult";
import { useCreateCardDraft } from "@/features/add-card/hooks/useCreateCardDraft";

type AddPhotoScreenProps = {
  onSaved: (cardId: string) => void;
};

type PhotoImportState = "idle" | "requestingPermission" | "picking" | "ready";

export function AddPhotoScreen({ onSaved }: AddPhotoScreenProps) {
  const { errorReporter, interactionFeedback, scannerService } = useDependencies();
  const [state, setState] = useState<PhotoImportState>("idle");
  const [photoError, setPhotoError] = useState<AppError | null>(null);
  const [values, setValues] = useState<AddCardFormValues | null>(null);
  const { createCard, error: saveError, isSaving } = useCreateCardDraft();

  async function handleChoosePhoto() {
    setPhotoError(null);
    setState("requestingPermission");

    try {
      const permission = await scannerService.requestPhotoPermission();

      if (permission.status !== "granted") {
        setPhotoError({
          kind: "permission",
          permission: "photos",
          message: "Photo access is needed to scan a barcode from an image."
        });
        interactionFeedback.warning();
        setState("idle");
        return;
      }

      setState("picking");
      const photoResult = await scannerService.scanFromPhotoLibrary();

      if (photoResult.status === "canceled") {
        setState("idle");
        return;
      }

      if (photoResult.status === "failed") {
        setPhotoError(photoResult.error);
        errorReporter.report(photoResult.error);
        interactionFeedback.warning();
        setState("idle");
        return;
      }

      const normalized = normalizeScanResult(photoResult.result);

      if (isAppError(normalized)) {
        setPhotoError(normalized);
        errorReporter.report(normalized);
        interactionFeedback.warning();
        setState("idle");
        return;
      }

      interactionFeedback.selectionChanged();
      setValues({
        barcodeFormat: normalized.barcodeFormat,
        cardNumber: normalized.cardNumber,
        storeName: ""
      });
      setState("ready");
    } catch (error) {
      const appError = toUnknownAppError(error);
      setPhotoError(appError);
      errorReporter.report(appError);
      interactionFeedback.error();
      setState("idle");
    }
  }

  async function handleSubmit() {
    if (!values) {
      return;
    }

    const card = await createCard(values);

    if (card) {
      onSaved(card.id);
    }
  }

  if (values && state === "ready") {
    return (
      <Screen contentContainerStyle={{ gap: spacing.xl }}>
        <AddCardFormView
          errorMessage={saveError?.message}
          helperText="Confirm the scanned number and add a store name before saving."
          isSaving={isSaving}
          onChange={setValues}
          onSubmit={handleSubmit}
          submitLabel="Save Card"
          title="Confirm Scanned Card"
          values={values}
        />
        <AppButton label="Choose Different Photo" onPress={handleChoosePhoto} variant="secondary" />
      </Screen>
    );
  }

  const isBusy = state === "requestingPermission" || state === "picking";

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <AppText variant="titleModal">Add From Photo</AppText>
      <AppText color={colors.text.secondary}>
        Select an image that contains a barcode. The card is saved only after confirmation.
      </AppText>
      {photoError ? <AppText color={colors.action.danger}>{photoError.message}</AppText> : null}
      <AppButton
        disabled={isBusy}
        label={isBusy ? "Scanning..." : "Choose Photo"}
        onPress={handleChoosePhoto}
      />
    </Screen>
  );
}
