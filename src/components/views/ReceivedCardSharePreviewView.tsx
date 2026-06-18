import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { ListRow } from "@/components/ui/ListRow";
import { colors, radius, spacing } from "@/design/tokens";
import { getCardNumberSuffix } from "@/domain/cards/card-display";
import type {
  ExportedCard,
  ImportBundlePreview
} from "@/domain/sharing/SharingPorts";

type ReceivedCardSharePreviewViewProps = {
  errorMessage?: string;
  isImporting: boolean;
  onCancel: () => void;
  onSave: () => void;
  preview?: ImportBundlePreview;
  sharedCard?: ExportedCard;
  status: "loading" | "ready" | "error";
};

export function ReceivedCardSharePreviewView({
  errorMessage,
  isImporting,
  onCancel,
  onSave,
  preview,
  sharedCard,
  status
}: ReceivedCardSharePreviewViewProps) {
  if (status === "loading") {
    return (
      <View accessibilityLiveRegion="polite" style={styles.container}>
        <AppText variant="titleModal">Opening Shared Card</AppText>
        <AppText color={colors.text.secondary}>
          Checking the link before anything is saved.
        </AppText>
      </View>
    );
  }

  if (status === "error" || !sharedCard || !preview) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.container}>
        <View style={styles.header}>
          <AppText variant="titleModal">Shared Card Unavailable</AppText>
          <AppText color={colors.text.secondary}>
            {errorMessage ?? "This link cannot be opened by this version of the app."}
          </AppText>
        </View>
        <AppButton label="Open Cards" onPress={onCancel} variant="secondary" />
      </View>
    );
  }

  const suffix = getCardNumberSuffix(sharedCard.cardNumber);
  const duplicateText =
    preview.duplicateCardCount > 0
      ? "A matching card already exists. Saving keeps a separate copy."
      : "No matching local card was found.";

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.header}>
        <AppText color={colors.text.secondary} variant="caption">
          Shared loyalty card
        </AppText>
        <AppText numberOfLines={3} variant="titleLarge">
          {sharedCard.storeName}
        </AppText>
      </View>

      <View style={styles.summary}>
        <ListRow detail={sharedCard.barcodeFormat.toUpperCase()} title="Barcode" />
        <ListRow detail={suffix ? `Ending in ${suffix}` : "Card number included"} title="Card number" />
        <ListRow detail={duplicateText} title="Duplicate check" />
      </View>

      {errorMessage ? (
        <View accessibilityRole="alert" style={styles.message}>
          <AppText color={colors.action.danger} variant="bodyStrong">
            Save Failed
          </AppText>
          <AppText color={colors.text.secondary}>{errorMessage}</AppText>
        </View>
      ) : null}

      <View style={styles.message}>
        <AppText variant="bodyStrong">Before You Save</AppText>
        <AppText color={colors.text.secondary}>
          The card will be stored locally on this device. Nothing is imported until you choose Save Card.
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton
          accessibilityLabel={`Save shared card from ${sharedCard.storeName}`}
          disabled={isImporting}
          label={isImporting ? "Saving..." : "Save Card"}
          onPress={onSave}
        />
        <AppButton disabled={isImporting} label="Not Now" onPress={onCancel} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    gap: spacing.xl,
    maxWidth: 560,
    width: "100%"
  },
  header: {
    gap: spacing.sm
  },
  summary: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.md
  },
  message: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    gap: spacing.xs,
    padding: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
