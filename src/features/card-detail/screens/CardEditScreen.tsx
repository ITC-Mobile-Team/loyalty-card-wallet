import { useMemo, useState } from "react";
import { Alert } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddCardFormView, type AddCardFormValues } from "@/components/views/AddCardFormView";
import { CardsGridSkeletonView } from "@/components/views/CardsGridSkeletonView";
import { spacing } from "@/design/tokens";
import type { LoyaltyCard } from "@/domain/cards/Card";
import type { PickedImage } from "@/domain/images/ImageSelection";
import { useCardDetails } from "@/features/card-detail/hooks/useCardDetails";
import { useCardImagePicker } from "@/features/images/hooks/useCardImagePicker";
import { pickedImageToDataUri } from "@/features/images/image-data-uri";
import { showImageSourceSheet } from "@/features/images/imageSourceSheet";

type CardEditScreenProps = {
  cardId: string;
  onCancel: () => void;
  onSaved: () => void;
};

export function CardEditScreen({ cardId, onCancel, onSaved }: CardEditScreenProps) {
  const { card, error, images, isLoading, isSaving, refresh, updateCard } = useCardDetails(cardId);

  return (
    <Screen contentContainerStyle={{ gap: spacing.xl }}>
      {isLoading ? <CardsGridSkeletonView /> : null}
      {error && !card ? (
        <EmptyState actionLabel="Retry" body={error.message} onAction={refresh} title="Card Could Not Load" />
      ) : null}
      {!isLoading && !error && !card ? (
        <EmptyState body={`Card ${cardId} is no longer available.`} title="Card Not Found" />
      ) : null}
      {card ? (
        <LoadedCardEditForm
          card={card}
          errorMessage={error?.message}
          existingImageUri={images.primaryImageUri}
          isSaving={isSaving}
          onCancel={onCancel}
          onSaved={onSaved}
          onSubmit={updateCard}
        />
      ) : null}
    </Screen>
  );
}

type LoadedCardEditFormProps = {
  card: LoyaltyCard;
  errorMessage?: string;
  existingImageUri?: string;
  isSaving: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onSubmit: (values: AddCardFormValues, primaryImage?: PickedImage) => Promise<LoyaltyCard | null>;
};

function LoadedCardEditForm({
  card,
  errorMessage,
  existingImageUri,
  isSaving,
  onCancel,
  onSaved,
  onSubmit
}: LoadedCardEditFormProps) {
  const [values, setValues] = useState<AddCardFormValues | null>(null);
  const [primaryImage, setPrimaryImage] = useState<PickedImage | null>(null);
  const imagePicker = useCardImagePicker();
  const imageMessage = [imagePicker.error?.message, imagePicker.recoveryMessage].filter(Boolean).join(" ");

  const formValues = useMemo(
    () =>
      values ?? {
        barcodeFormat: card.barcodeFormat,
        cardNumber: card.cardNumber,
        notes: card.notes,
        storeName: card.storeName
      },
    [card.barcodeFormat, card.cardNumber, card.notes, card.storeName, values]
  );

  const isDirty = useMemo(() => {
    return (
      formValues.storeName !== card.storeName ||
      formValues.cardNumber !== card.cardNumber ||
      formValues.barcodeFormat !== card.barcodeFormat ||
      (formValues.notes ?? "") !== (card.notes ?? "") ||
      primaryImage !== null
    );
  }, [card, formValues, primaryImage]);

  async function handleSubmit() {
    const updatedCard = await onSubmit(formValues, primaryImage ?? undefined);

    if (updatedCard) {
      onSaved();
    }
  }

  function handleCancel() {
    if (!isDirty) {
      onCancel();
      return;
    }

    Alert.alert("Discard changes?", "Close edit without saving changes to this card?", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onCancel }
    ]);
  }

  function handleChooseImage() {
    showImageSourceSheet({
      onSelect: (source) => {
        void imagePicker.pickImage(source).then((image) => {
          if (image) {
            setPrimaryImage(image);
          }
        });
      }
    });
  }

  return (
    <>
      <AddCardFormView
        errorMessage={errorMessage}
        helperText="Update the saved card metadata. Changes stay local to this device."
        imagePreviewUri={primaryImage ? pickedImageToDataUri(primaryImage) : existingImageUri}
        imageRecoveryMessage={imageMessage || undefined}
        isImagePicking={imagePicker.isPicking}
        isSaving={isSaving}
        onChange={setValues}
        onChooseImage={handleChooseImage}
        onRemoveImage={primaryImage ? () => setPrimaryImage(null) : undefined}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        title="Edit Card"
        values={formValues}
      />
      <AppButton label="Cancel" onPress={handleCancel} variant="secondary" />
    </>
  );
}
