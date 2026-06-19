import { Image, Pressable, StyleSheet, View } from "react-native";
import { MoreHorizontal, SignalHigh } from "lucide-react-native";

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
  onCopyCardNumber: () => void;
  onOpenActions: () => void;
};

export function CardDetailView({
  barcode,
  barcodeError,
  card,
  imageCount,
  imageUri,
  isBarcodeLoading,
  onCopyCardNumber,
  onOpenActions
}: CardDetailViewProps) {
  const notes = card.notes?.trim();
  const displayValue = barcode?.displayValue ?? formatCardNumberForDisplay(card.cardNumber);
  const formatLabel = card.barcodeFormat.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.identityRow}>
        <View style={styles.identityLockup}>
          <View style={styles.initialBadge}>
            {imageUri ? (
              <>
                <Image
                  accessible={false}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel=""
                  resizeMode="cover"
                  source={{ uri: imageUri }}
                  style={styles.badgeImage}
                />
                <View style={styles.badgeImageOverlay} />
              </>
            ) : null}
            <AppText color={imageUri ? colors.text.primary : colors.text.inverse} style={styles.initialText} variant="titleModal">
              {getCardInitials(card.storeName)}
            </AppText>
          </View>
          <View style={styles.identityCopy}>
            <AppText numberOfLines={1} variant="titleModal">
              {card.storeName}
            </AppText>
            <AppText color={colors.text.secondary} variant="caption">
              {formatLabel}
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityLabel={`More actions for ${card.storeName}`}
          accessibilityRole="button"
          onPress={onOpenActions}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <MoreHorizontal color={colors.text.primary} size={24} />
        </Pressable>
      </View>

      <View style={styles.readyPanel}>
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <AppText color="#76F1B3" style={styles.readyPillText} variant="caption">
            Ready to scan
          </AppText>
        </View>
        <AppText style={styles.readyTitle} variant="titleModal">
          Barcode is bright and centered
        </AppText>
      </View>

      <BarcodePanelView
        barcode={barcode}
        displayValue={displayValue}
        error={barcodeError}
        formatLabel={formatLabel}
        isLoading={isBarcodeLoading}
        onCopyDisplayValue={onCopyCardNumber}
      />

      <View style={styles.brightnessRow}>
        <AppText color={colors.text.secondary} style={styles.brightnessText} variant="caption">
          Screen stays bright while card is open
        </AppText>
        <SignalHigh color="#D6FF61" size={24} />
      </View>

      <View style={styles.rows}>
        <ListRow
          detail={`${notes || "No notes"}, ${imageCount > 0 ? `${imageCount} pictures` : "no pictures"}`}
          title="Card info"
        />
        <ListRow
          accessibilityLabel={`More actions for ${card.storeName}`}
          detail="Scan mode, share, edit, or delete"
          onPress={onOpenActions}
          title="More actions"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  identityLockup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm
  },
  initialBadge: {
    alignItems: "center",
    backgroundColor: "#76F1B3",
    borderRadius: radius.icon + 4,
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58
  },
  badgeImage: {
    ...StyleSheet.absoluteFill
  },
  badgeImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.42)"
  },
  initialText: {
    fontWeight: "800",
    zIndex: 1
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xxs
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.icon,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  readyPanel: {
    backgroundColor: "rgba(118,241,179,0.1)",
    borderColor: "rgba(118,241,179,0.25)",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.lg
  },
  readyPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  readyDot: {
    backgroundColor: "#76F1B3",
    borderRadius: 4,
    height: 7,
    width: 7
  },
  readyPillText: {
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  readyTitle: {
    maxWidth: 280
  },
  brightnessRow: {
    alignItems: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  brightnessText: {
    flex: 1,
    fontWeight: "700"
  },
  rows: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card + 6,
    overflow: "hidden",
    paddingHorizontal: spacing.md
  },
  pressed: {
    opacity: 0.72
  }
});
