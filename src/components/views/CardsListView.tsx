import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText color={colors.text.secondary} variant="bodyStrong">
          My cards
        </AppText>
        <AppButton
          accessibilityLabel="Add card"
          label="Add"
          onPress={onAddCard}
          style={styles.addButton}
          variant="secondary"
        />
      </View>
      <View style={styles.grid}>
        {cards.map(({ card, imageUri }) => {
          const suffix = getCardNumberSuffix(card.cardNumber);

          return (
            <Pressable
              accessibilityLabel={getCardAccessibilityLabel(card)}
              accessibilityRole="button"
              key={card.id}
              onPress={() => onOpenCard(card.id)}
              style={({ pressed }) => [
                styles.cardTile,
                { backgroundColor: card.backgroundColor ?? colors.surface.raised },
                pressed && styles.cardTilePressed
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
                    style={styles.cardImage}
                  />
                  <View style={styles.imageOverlay} />
                </>
              ) : null}
              <View style={styles.initialBadge}>
                <AppText color={colors.text.inverse} variant="titleModal">
                  {getCardInitials(card.storeName)}
                </AppText>
              </View>
              <View style={styles.cardText}>
                <AppText numberOfLines={2} variant="bodyStrong">
                  {card.storeName}
                </AppText>
                {suffix ? (
                  <AppText color={colors.text.secondary} variant="caption">
                    Ends in {suffix}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48
  },
  addButton: {
    minHeight: 44,
    minWidth: 72
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  cardTile: {
    aspectRatio: 1.5,
    borderRadius: radius.card,
    justifyContent: "space-between",
    minHeight: 148,
    padding: spacing.md,
    overflow: "hidden",
    width: "47%"
  },
  cardImage: {
    ...StyleSheet.absoluteFill
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.32)"
  },
  cardTilePressed: {
    opacity: 0.82
  },
  initialBadge: {
    alignItems: "center",
    backgroundColor: colors.action.focus,
    borderRadius: radius.icon,
    height: 44,
    justifyContent: "center",
    width: 44,
    zIndex: 1
  },
  cardText: {
    gap: spacing.xxs,
    zIndex: 1
  }
});
