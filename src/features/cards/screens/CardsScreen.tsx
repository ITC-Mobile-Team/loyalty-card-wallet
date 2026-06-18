import { useEffect } from "react";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { CardsGridSkeletonView } from "@/components/views/CardsGridSkeletonView";
import { CardsListView } from "@/components/views/CardsListView";
import { colors, spacing } from "@/design/tokens";
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
    <Screen contentContainerStyle={{ gap: spacing.xl }}>
      <AppText variant="titleLarge">Cards</AppText>
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
