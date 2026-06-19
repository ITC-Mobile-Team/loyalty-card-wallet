import { Image, Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, ScanLine } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors, radius, spacing } from "@/design/tokens";
import { getCardAccessibilityLabel, getCardInitials, getCardNumberSuffix } from "@/domain/cards/card-display";
import type { CardListItem } from "@/features/cards/hooks/useCards";

type CardsListViewProps = {
  cards: CardListItem[];
  onAddCard: () => void;
  onOpenCard: (cardId: string) => void;
};

export function CardsListView({ cards, onAddCard, onOpenCard }: CardsListViewProps) {
  if (cards.length === 0) {
    return (
      <EmptyState
        actionLabel="Scan Card"
        body="Add your first loyalty card by scanning its barcode."
        onAction={onAddCard}
        title="No Cards Yet"
      />
    );
  }

  const [featuredCard, ...stackedCards] = cards;
  const featuredSuffix = featuredCard ? getCardNumberSuffix(featuredCard.card.cardNumber) : "";

  return (
    <View style={styles.container}>
      {featuredCard ? (
        <Pressable
          accessibilityLabel={getCardAccessibilityLabel(featuredCard.card)}
          accessibilityRole="button"
          onPress={() => onOpenCard(featuredCard.card.id)}
          style={({ pressed }) => [
            styles.featuredCard,
            { backgroundColor: featuredCard.card.backgroundColor ?? "#103B32" },
            pressed && styles.pressed
          ]}
        >
          {featuredCard.imageUri ? (
            <>
              <Image
                accessible={false}
                accessibilityIgnoresInvertColors
                accessibilityLabel=""
                resizeMode="cover"
                source={{ uri: featuredCard.imageUri }}
                style={styles.cardImage}
              />
              <View style={styles.featuredImageOverlay} />
            </>
          ) : null}
          <View style={styles.featuredTopRow}>
            <View style={styles.readyPill}>
              <View style={styles.readyDot} />
              <AppText color="#76F1B3" style={styles.readyText} variant="caption">
                Ready at checkout
              </AppText>
            </View>
            <View style={[styles.initialBadge, styles.featuredInitialBadge]}>
              <AppText color="#76F1B3" variant="titleModal">
                {getCardInitials(featuredCard.card.storeName)}
              </AppText>
            </View>
          </View>
          <View style={styles.featuredCopy}>
            <AppText color={colors.text.secondary} style={styles.featuredEyebrow} variant="caption">
              First in wallet
            </AppText>
            <AppText numberOfLines={2} style={styles.featuredTitle} variant="titleLarge">
              {featuredCard.card.storeName}
            </AppText>
          </View>
          <View style={styles.featuredFooter}>
            <AppText color={colors.text.secondary} style={styles.featuredMeta} variant="caption">
              {featuredCard.card.barcodeFormat.toUpperCase()}
              {featuredSuffix ? ` · ${featuredSuffix}` : ""}
            </AppText>
            <View style={styles.openHint}>
              <AppText style={styles.openHintText} variant="caption">
                Open
              </AppText>
              <ChevronRight color={colors.text.primary} size={16} />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.stack}>
        {stackedCards.map(({ card, imageUri }, index) => {
          const suffix = getCardNumberSuffix(card.cardNumber);
          const accentColor = card.backgroundColor ?? cardAccentColors[index % cardAccentColors.length];

          return (
            <Pressable
              accessibilityLabel={getCardAccessibilityLabel(card)}
              accessibilityRole="button"
              key={card.id}
              onPress={() => onOpenCard(card.id)}
              style={({ pressed }) => [
                styles.stackCard,
                { backgroundColor: withAlpha(accentColor, 0.3), borderColor: withAlpha(accentColor, 0.32) },
                pressed && styles.pressed
              ]}
            >
              {imageUri ? (
                <>
                  <Image
                    accessible={false}
                    accessibilityIgnoresInvertColors
                    accessibilityLabel=""
                    resizeMode="cover"
                    source={{ uri: imageUri }}
                    style={styles.stackImage}
                  />
                  <View style={styles.stackImageOverlay} />
                </>
              ) : null}
              <View style={[styles.initialBadge, { backgroundColor: accentColor }]}>
                <AppText color={colors.text.inverse} variant="titleModal">
                  {getCardInitials(card.storeName)}
                </AppText>
              </View>
              <View style={styles.stackCopy}>
                <AppText numberOfLines={2} variant="bodyStrong">
                  {card.storeName}
                </AppText>
                {suffix ? (
                  <AppText color={colors.text.secondary} variant="caption">
                    Ends in {suffix}
                  </AppText>
                ) : null}
              </View>
              <ChevronRight color={colors.text.muted} size={22} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel="Add card. Scan barcode or enter manually."
        accessibilityRole="button"
        onPress={onAddCard}
        style={({ pressed }) => [styles.addCardBanner, pressed && styles.pressed]}
      >
        <View style={styles.addBannerCopy}>
          <AppText color={colors.text.inverse} variant="bodyStrong">
            Add a card
          </AppText>
          <AppText color={colors.text.inverse} style={styles.addBannerDetail} variant="caption">
            Scan barcode or enter manually
          </AppText>
        </View>
        <View style={styles.scanChip}>
          <ScanLine color={colors.text.primary} size={16} />
          <AppText style={styles.scanChipText} variant="caption">
            Scan
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

const cardAccentColors = ["#64D2FF", "#76F1B3", "#FFD166", "#A78BFA"];

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) {
    return colors.surface.raised;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  featuredCard: {
    borderRadius: 28,
    justifyContent: "space-between",
    minHeight: 228,
    overflow: "hidden",
    padding: spacing.lg
  },
  cardImage: {
    ...StyleSheet.absoluteFill
  },
  featuredImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.58)"
  },
  featuredTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1
  },
  readyPill: {
    alignItems: "center",
    backgroundColor: "rgba(118,241,179,0.16)",
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  readyDot: {
    backgroundColor: "#76F1B3",
    borderRadius: 4,
    height: 7,
    width: 7
  },
  readyText: {
    fontWeight: "700"
  },
  initialBadge: {
    alignItems: "center",
    backgroundColor: colors.action.focus,
    borderRadius: radius.icon + 2,
    height: 56,
    justifyContent: "center",
    width: 56,
    zIndex: 1
  },
  featuredInitialBadge: {
    backgroundColor: colors.surface.app
  },
  featuredCopy: {
    gap: spacing.xs,
    marginTop: spacing.xxxl,
    zIndex: 1
  },
  featuredEyebrow: {
    fontWeight: "700"
  },
  featuredTitle: {
    lineHeight: 38
  },
  featuredFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    zIndex: 1
  },
  featuredMeta: {
    fontWeight: "700"
  },
  openHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs
  },
  openHintText: {
    fontWeight: "700"
  },
  stack: {
    gap: spacing.sm
  },
  stackCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 86,
    overflow: "hidden",
    padding: spacing.sm
  },
  stackImage: {
    ...StyleSheet.absoluteFill
  },
  stackImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.62)"
  },
  stackCopy: {
    flex: 1,
    gap: spacing.xxs,
    zIndex: 1
  },
  addCardBanner: {
    alignItems: "center",
    backgroundColor: "#76F1B3",
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  addBannerCopy: {
    gap: spacing.xxs
  },
  addBannerDetail: {
    fontWeight: "600",
    opacity: 0.72
  },
  scanChip: {
    alignItems: "center",
    backgroundColor: colors.surface.app,
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.xxs,
    minHeight: 40,
    paddingHorizontal: spacing.sm
  },
  scanChipText: {
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.82
  }
});
