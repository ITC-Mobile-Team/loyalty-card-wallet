import { useEffect } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Archive, ListFilter, Plus, Search, Star } from "lucide-react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { CardsGridSkeletonView } from "@/components/views/CardsGridSkeletonView";
import { CardsListView } from "@/components/views/CardsListView";
import { useStartupSplash } from "@/core/startup/StartupSplash";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { useCards } from "@/features/cards/hooks/useCards";

type CardsScreenProps = {
  onAddCard: () => void;
  onOpenCard: (cardId: string) => void;
  refreshSignal?: number;
};

export function CardsScreen({ onAddCard, onOpenCard, refreshSignal = 0 }: CardsScreenProps) {
  const {
    cards,
    error,
    filters,
    isLoading,
    markUsed,
    refresh,
    setArchived,
    setFavoriteOnly,
    setSearch,
    setSort,
    toggleArchive,
    toggleFavorite,
    total
  } = useCards();
  const { markReady } = useStartupSplash();

  useEffect(() => {
    if (refreshSignal > 0) {
      void refresh({ silent: true });
    }
  }, [refresh, refreshSignal]);

  useEffect(() => {
    if (!isLoading) {
      markReady();
    }
  }, [isLoading, markReady]);

  async function handleOpenCard(cardId: string) {
    const item = cards.find(({ card }) => card.id === cardId);
    if (item) {
      void markUsed(item.card);
    }
    onOpenCard(cardId);
  }

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
      <View style={styles.searchField}>
        <Search color={colors.text.muted} size={20} />
        <TextInput
          accessibilityLabel="Search cards"
          onChangeText={setSearch}
          placeholder="Search cards"
          placeholderTextColor={colors.text.muted}
          style={styles.searchInput}
          value={filters.search}
        />
      </View>
      <View style={styles.controls}>
        <FilterChip
          icon={<ListFilter color={filters.sort === "alphabetical" ? colors.text.inverse : colors.text.primary} size={16} />}
          label={filters.sort === "recent" ? "Recent" : "A–Z"}
          onPress={() => setSort(filters.sort === "recent" ? "alphabetical" : "recent")}
          selected={filters.sort === "alphabetical"}
        />
        <FilterChip
          icon={<Star color={filters.favoriteOnly ? colors.text.inverse : colors.text.primary} size={16} />}
          label="Favorites"
          onPress={() => setFavoriteOnly(!filters.favoriteOnly)}
          selected={filters.favoriteOnly}
        />
        <FilterChip
          icon={<Archive color={filters.archived ? colors.text.inverse : colors.text.primary} size={16} />}
          label="Archived"
          onPress={() => setArchived(!filters.archived)}
          selected={filters.archived}
        />
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
        <CardsListView
          cards={cards}
          emptyBody={
            filters.search || filters.favoriteOnly || filters.archived
              ? "Try changing the search or filters."
              : undefined
          }
          emptyTitle={
            filters.search || filters.favoriteOnly || filters.archived ? "No Matching Cards" : undefined
          }
          onAddCard={onAddCard}
          onOpenCard={handleOpenCard}
          onToggleArchive={toggleArchive}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
      {error && cards.length === 0 ? <AppButton label="Scan Card" onPress={onAddCard} variant="secondary" /> : null}
      {error && cards.length > 0 ? <AppText color={colors.text.secondary}>Could not refresh cards.</AppText> : null}
      {total > cards.length ? (
        <AppText color={colors.text.muted}>Showing the first {cards.length} of {total} cards.</AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingTop: spacing.lg
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.xxs,
    minHeight: 44,
    paddingHorizontal: spacing.sm
  },
  filterChipSelected: {
    backgroundColor: colors.action.focus
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
  },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    color: colors.text.primary,
    flex: 1,
    ...typography.bodyPrimary
  }
});

function FilterChip({
  icon,
  label,
  onPress,
  selected
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      {icon}
      <AppText color={selected ? colors.text.inverse : colors.text.primary} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}
