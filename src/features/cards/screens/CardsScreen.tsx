import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Plus } from "lucide-react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { CardsGridSkeletonView } from "@/components/views/CardsGridSkeletonView";
import { CardsListView } from "@/components/views/CardsListView";
import { colors, radius, spacing } from "@/design/tokens";
import { useCards } from "@/features/cards/hooks/useCards";

type CardsScreenProps = {
  onAddCard: () => void;
  onOpenCard: (cardId: string) => void;
  refreshSignal?: number;
};

export function CardsScreen({ onAddCard, onOpenCard, refreshSignal = 0 }: CardsScreenProps) {
  const { cards, error, isLoading, refresh } = useCards();

  useEffect(() => {
    if (refreshSignal > 0) {
      void refresh({ silent: true });
    }
  }, [refresh, refreshSignal]);

  return (
    <Screen contentContainerStyle={styles.content} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText color={colors.text.muted} variant="caption">
            Today
          </AppText>
          <AppText variant="titleLarge">Your wallet</AppText>
        </View>
        <Pressable
          accessibilityLabel="Add card"
          accessibilityRole="button"
          onPress={onAddCard}
          style={({ pressed }) => [styles.addIconButton, pressed && styles.pressed]}
        >
          <Plus color={colors.text.inverse} size={28} strokeWidth={3} />
        </Pressable>
      </View>
      {isLoading && cards.length === 0 ? <CardsGridSkeletonView /> : null}
      {error && cards.length === 0 ? (
        <EmptyState
          actionLabel="Retry"
          body={error.message}
          onAction={refresh}
          title="Cards Could Not Load"
        />
      ) : null}
      {cards.length > 0 || (!isLoading && !error) ? (
        <CardsListView cards={cards} onAddCard={onAddCard} onOpenCard={onOpenCard} />
      ) : null}
      {error && cards.length === 0 ? <AppButton label="Scan Card" onPress={onAddCard} variant="secondary" /> : null}
      {error && cards.length > 0 ? <AppText color={colors.text.secondary}>Could not refresh cards.</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingTop: spacing.lg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  titleBlock: {
    gap: spacing.xxs
  },
  addIconButton: {
    alignItems: "center",
    backgroundColor: "#76F1B3",
    borderRadius: radius.icon + 4,
    height: 52,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    width: 52
  },
  pressed: {
    opacity: 0.78
  }
});
