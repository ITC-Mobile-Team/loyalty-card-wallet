import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { BarcodeFormat } from "@/domain/cards/Card";

export type AddCardFormValues = {
  barcodeFormat: BarcodeFormat;
  cardNumber: string;
  notes?: string;
  storeName: string;
};

type AddCardFormViewProps = {
  errorMessage?: string;
  helperText?: string;
  imagePreviewUri?: string;
  imageRecoveryMessage?: string;
  isImagePicking?: boolean;
  isSaving: boolean;
  onChange: (values: AddCardFormValues) => void;
  onChooseImage?: () => void;
  onRemoveImage?: () => void;
  onSubmit: () => void;
  showImageField?: boolean;
  submitLabel: string;
  title: string;
  values: AddCardFormValues;
};

const formatOptions: BarcodeFormat[] = ["code128", "code39", "ean13", "ean8", "upca", "upce", "itf", "qr"];

export function AddCardFormView({
  errorMessage,
  helperText,
  imagePreviewUri,
  imageRecoveryMessage,
  isImagePicking = false,
  isSaving,
  onChange,
  onChooseImage,
  onRemoveImage,
  onSubmit,
  showImageField,
  submitLabel,
  title,
  values
}: AddCardFormViewProps) {
  const canSubmit = values.storeName.trim().length > 0 && values.cardNumber.trim().length > 0 && !isSaving;
  const shouldShowImageField = showImageField ?? Boolean(onChooseImage || imagePreviewUri || imageRecoveryMessage);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="titleModal">{title}</AppText>
        {helperText ? (
          <AppText color={colors.text.secondary} style={styles.helper}>
            {helperText}
          </AppText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">Store name</AppText>
        <TextInput
          accessibilityLabel="Store name"
          autoCapitalize="words"
          onChangeText={(storeName) => onChange({ ...values, storeName })}
          placeholder="Coffee Club"
          placeholderTextColor={colors.text.muted}
          returnKeyType="next"
          style={styles.input}
          value={values.storeName}
        />
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">Card number</AppText>
        <TextInput
          accessibilityLabel="Card number"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          onChangeText={(cardNumber) => onChange({ ...values, cardNumber })}
          placeholder="1234567890"
          placeholderTextColor={colors.text.muted}
          style={styles.input}
          value={values.cardNumber}
        />
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">Barcode format</AppText>
        <View style={styles.formatGrid}>
          {formatOptions.map((format) => {
            const selected = values.barcodeFormat === format;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${format.toUpperCase()} barcode format`}
                accessibilityState={{ selected }}
                key={format}
                onPress={() => onChange({ ...values, barcodeFormat: format })}
                style={[styles.formatOption, selected && styles.formatOptionSelected]}
              >
                <AppText
                  color={selected ? colors.text.inverse : colors.text.primary}
                  style={styles.formatLabel}
                  variant="caption"
                >
                  {format.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {shouldShowImageField ? (
        <View style={styles.fieldGroup}>
          <AppText variant="bodyStrong">Image</AppText>
          <Pressable
            accessibilityLabel={imagePreviewUri ? "Change selected card image" : "Choose card image"}
            accessibilityRole="button"
            accessibilityState={{ disabled: !onChooseImage || isImagePicking }}
            disabled={!onChooseImage || isImagePicking}
            onPress={onChooseImage}
            style={({ pressed }) => [
              styles.imageRow,
              pressed && styles.imageRowPressed,
              !onChooseImage && styles.imageRowDisabled
            ]}
          >
            {imagePreviewUri ? (
              <Image
                accessible={false}
                accessibilityIgnoresInvertColors
                accessibilityLabel=""
                resizeMode="cover"
                source={{ uri: imagePreviewUri }}
                style={styles.imagePreview}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <AppText color={colors.text.secondary} variant="caption">
                  No image
                </AppText>
              </View>
            )}
            <View style={styles.imageCopy}>
              <AppText variant="bodyStrong">{isImagePicking ? "Opening..." : "Choose image"}</AppText>
              <AppText color={colors.text.secondary} variant="caption">
                Camera or photo library
              </AppText>
            </View>
          </Pressable>
          {imagePreviewUri && onRemoveImage ? (
            <AppButton label="Remove Selected Image" onPress={onRemoveImage} variant="secondary" />
          ) : null}
          {imageRecoveryMessage ? (
            <AppText color={colors.text.secondary} variant="caption">
              {imageRecoveryMessage}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">Notes</AppText>
        <TextInput
          accessibilityLabel="Notes"
          multiline
          onChangeText={(notes) => onChange({ ...values, notes })}
          placeholder="Optional note"
          placeholderTextColor={colors.text.muted}
          style={[styles.input, styles.notesInput]}
          textAlignVertical="top"
          value={values.notes ?? ""}
        />
      </View>

      {errorMessage ? <AppText color={colors.action.danger}>{errorMessage}</AppText> : null}

      <AppButton disabled={!canSubmit} label={isSaving ? "Saving..." : submitLabel} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  header: {
    gap: spacing.xs
  },
  helper: {
    maxWidth: 520
  },
  fieldGroup: {
    gap: spacing.xs
  },
  imageRow: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.sm
  },
  imageRowDisabled: {
    opacity: 0.72
  },
  imageRowPressed: {
    opacity: 0.82
  },
  imagePreview: {
    borderRadius: radius.field,
    height: 56,
    width: 84
  },
  imagePlaceholder: {
    alignItems: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    height: 56,
    justifyContent: "center",
    width: 84
  },
  imageCopy: {
    flex: 1,
    gap: spacing.xxs
  },
  input: {
    ...typography.bodyPrimary,
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    color: colors.text.primary,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  notesInput: {
    minHeight: 104
  },
  formatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  formatOption: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    minHeight: 40,
    minWidth: 76,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  formatOptionSelected: {
    backgroundColor: colors.action.focus,
    borderColor: colors.action.focus
  },
  formatLabel: {
    textAlign: "center"
  }
});
