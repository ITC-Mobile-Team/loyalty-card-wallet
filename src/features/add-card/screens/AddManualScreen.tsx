import { useState } from "react";

import { AddCardFormView, type AddCardFormValues } from "@/components/views/AddCardFormView";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/design/tokens";
import type { PickedImage } from "@/domain/images/ImageSelection";
import { useCreateCardDraft } from "@/features/add-card/hooks/useCreateCardDraft";
import { useCardImagePicker } from "@/features/images/hooks/useCardImagePicker";
import { pickedImageToDataUri } from "@/features/images/image-data-uri";
import { showImageSourceSheet } from "@/features/images/imageSourceSheet";

type AddManualScreenProps = {
  initialBackgroundColor?: string;
  initialStoreName?: string;
  onSaved: (cardId: string) => void;
};

export function AddManualScreen({ initialBackgroundColor, initialStoreName = "", onSaved }: AddManualScreenProps) {
  const [values, setValues] = useState<AddCardFormValues>({
    backgroundColor: initialBackgroundColor,
    barcodeFormat: "code128",
    cardNumber: "",
    storeName: initialStoreName
  });
  const [primaryImage, setPrimaryImage] = useState<PickedImage | null>(null);
  const imagePicker = useCardImagePicker();
  const { createCard, error, isSaving } = useCreateCardDraft();
  const imageMessage = [imagePicker.error?.message, imagePicker.recoveryMessage].filter(Boolean).join(" ");

  async function handleSubmit() {
    const card = await createCard(values, primaryImage ?? undefined);

    if (card) {
      onSaved(card.id);
    }
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
    <Screen contentContainerStyle={{ gap: spacing.xl }}>
      <AddCardFormView
        errorMessage={error?.message}
        helperText="Enter the card details exactly as they should be saved in your local wallet."
        imagePreviewUri={primaryImage ? pickedImageToDataUri(primaryImage) : undefined}
        imageRecoveryMessage={imageMessage || undefined}
        isImagePicking={imagePicker.isPicking}
        isSaving={isSaving}
        onChange={setValues}
        onChooseImage={handleChooseImage}
        onRemoveImage={() => setPrimaryImage(null)}
        onSubmit={handleSubmit}
        submitLabel="Save Card"
        title="Enter Card Manually"
        values={values}
      />
    </Screen>
  );
}
