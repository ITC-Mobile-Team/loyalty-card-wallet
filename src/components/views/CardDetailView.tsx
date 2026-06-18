import { Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { ListRow } from "@/components/ui/ListRow";
import { BarcodePanelView } from "@/components/views/BarcodePanelView";
import type { AppError } from "@/core/errors/AppError";
import { colors, radius, spacing } from "@/design/tokens";
import type { RenderedBarcode } from "@/domain/barcode/BarcodeRenderer";
import type { LoyaltyCard } from "@/domain/cards/Card";
import { formatCardNumberForDisplay, getCardInitials } from "@/domain/cards/card-display";

type CardDetailViewProps = {
  barcode: RenderedBarcode | null;
  barcodeError: AppError | null;
  card: LoyaltyCard;
  imageCount: number;
  imageUri?: string;
  isBarcodeLoading: boolean;
  onOpenActions: () => void;
};

export function CardDetailView({
  barcode,
  barcodeError,
  card,
  imageCount,
  imageUri,
  isBarcodeLoading,
  onOpenActions
}: CardDetailViewProps) {
  const notes = card.notes?.trim();
  const displayValue = barcode?.displayValue ?? formatCardNumberForDisplay(card.cardNumber);
  const formatLabel = card.barcodeFormat.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.cardHeader, { backgroundColor: card.backgroundColor ?? colors.surface.raised }]}>
        {imageUri ? (
          <>
            <Image
              accessible={false}
              accessibilityIgnoresInvertColors
              accessibilityLabel=""
              resizeMode="cover"
              source={{ uri: imageUri }}
              style={styles.headerImage}
            />
            <View style={styles.headerImageOverlay} />
          </>
        ) : null}
        <View style={styles.initialBadge}>
          <AppText color={colors.text.inverse} variant="titleLarge">
            {getCardInitials(card.storeName)}
          </AppText>
        </View>
        <View style={styles.headerCopy}>
          <AppText numberOfLines={2} variant="titleModal">
            {card.storeName}
          </AppText>
          <AppText color={colors.text.secondary} variant="caption">
            {formatLabel}
          </AppText>
        </View>
      </View>

      <BarcodePanelView
        barcode={barcode}
        displayValue={displayValue}
        error={barcodeError}
        formatLabel={formatLabel}
        isLoading={isBarcodeLoading}
      />

      <View style={styles.rows}>
        <ListRow detail={notes || "No notes"} title="Notes" />
        <ListRow detail={imageCount > 0 ? `${imageCount} saved` : "No pictures"} title="Pictures" />
      </View>

      <View style={styles.rows}>
        <ListRow
          accessibilityLabel={`More actions for ${card.storeName}`}
          detail="Scan mode, share card, edit card, delete card"
          onPress={onOpenActions}
          title="More"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl
  },
  cardHeader: {
    borderRadius: radius.card,
    gap: spacing.md,
    minHeight: 164,
    overflow: "hidden",
    padding: spacing.lg
  },
  headerImage: {
    ...StyleSheet.absoluteFill
  },
  headerImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.34)"
  },
  initialBadge: {
    alignItems: "center",
    backgroundColor: colors.action.focus,
    borderRadius: radius.icon,
    height: 64,
    justifyContent: "center",
    width: 64,
    zIndex: 1
  },
  headerCopy: {
    gap: spacing.xxs,
    zIndex: 1
  },
  rows: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.md
  }
});
