import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Search, MapPin } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { useStores } from "@/features/stores/hooks/useStores";
import {
  buildStoreCategoryFilters,
  filterStoresByCategory,
  type StoreCategoryFilter
} from "@/features/stores/storeCategoryFilters";

export function StoresScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const {
    city,
    error,
    isLoading,
    isUsingLocation,
    searchTerm,
    setCity,
    setSearchTerm,
    sourceAttribution,
    stores,
    total,
    requestCurrentLocation,
    refresh,
    searchCity
  } = useStores();
  const categoryFilters = useMemo(() => buildStoreCategoryFilters(stores), [stores]);
  const activeCategory = categoryFilters.some((filter) => filter.value === selectedCategory) ? selectedCategory : null;
  const visibleStores = useMemo(() => filterStoresByCategory(stores, activeCategory), [activeCategory, stores]);

  return (
    <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <AppText variant="titleLarge">Stores</AppText>
        <AppText color={colors.text.secondary}>
          Find nearby store names from OpenStreetMap, then use them when creating loyalty cards.
        </AppText>
      </View>

      <View style={styles.controls}>
        <View style={styles.fieldGroup}>
          <AppText variant="caption">City</AppText>
          <TextInput
            accessibilityLabel="City"
            autoCapitalize="words"
            onChangeText={setCity}
            onSubmitEditing={() => void searchCity()}
            placeholder="Enter city"
            placeholderTextColor={colors.text.muted}
            returnKeyType="search"
            style={styles.input}
            value={city}
          />
        </View>

        <View style={styles.buttonRow}>
          <AppButton
            disabled={isLoading}
            label="Search City"
            onPress={() => void searchCity()}
            style={styles.button}
            variant="primary"
          />
          <AppButton
            accessibilityLabel="Use current location"
            disabled={isLoading || isUsingLocation}
            label={isUsingLocation ? "Locating..." : "Near Me"}
            onPress={() => void requestCurrentLocation()}
            style={styles.button}
            variant="secondary"
          />
        </View>

        <View style={styles.searchField}>
          <Search color={colors.text.muted} size={18} />
          <TextInput
            accessibilityLabel="Search stores"
            autoCapitalize="none"
            onChangeText={setSearchTerm}
            placeholder="Search store name or category"
            placeholderTextColor={colors.text.muted}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchTerm}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText color={colors.action.danger}>{error.message}</AppText>
          <AppButton label="Retry" onPress={() => void refresh()} variant="secondary" />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateBox}>
          <AppText color={colors.text.secondary}>Loading stores...</AppText>
        </View>
      ) : null}

      {!isLoading && stores.length === 0 && !error ? (
        <EmptyState body="Try another city, a smaller search term, or current location." title="No Stores Found" />
      ) : null}

      {stores.length > 0 ? (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <AppText variant="bodyStrong">
              {activeCategory ? `${visibleStores.length} of ${total} stores` : `${total} stores`}
            </AppText>
            <AppText color={colors.text.secondary}>OpenStreetMap</AppText>
          </View>
          {categoryFilters.length > 1 ? (
            <CategoryFilters
              filters={categoryFilters}
              onSelect={setSelectedCategory}
              selectedCategory={activeCategory}
            />
          ) : null}
          <View style={styles.group}>
            {visibleStores.map((store) => (
              <ListRow
                accessibilityLabel={[
                  store.name,
                  store.category,
                  store.address,
                  "Open store details"
                ].filter(Boolean).join(", ")}
                detail={[store.category, store.address].filter(Boolean).join(" • ")}
                key={store.id}
                onPress={() => router.push(`/store/${encodeURIComponent(store.id)}`)}
                title={store.name}
              />
            ))}
          </View>
        </View>
      ) : null}

      {sourceAttribution ? (
        <View style={styles.attribution}>
          <MapPin color={colors.text.muted} size={16} />
          <AppText color={colors.text.muted} style={styles.attributionText} variant="caption">
            {sourceAttribution}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

function CategoryFilters({
  filters,
  onSelect,
  selectedCategory
}: {
  filters: StoreCategoryFilter[];
  onSelect: (category: string | null) => void;
  selectedCategory: string | null;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.categoryChips}
      showsHorizontalScrollIndicator={false}
    >
      {filters.map((filter) => {
        const isSelected = filter.value === selectedCategory;

        return (
          <Pressable
            accessibilityLabel={`${filter.label}, ${filter.count} stores`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={filter.value ?? "all"}
            onPress={() => onSelect(filter.value)}
            style={({ pressed }) => [
              styles.categoryChip,
              isSelected && styles.categoryChipSelected,
              pressed && styles.pressed
            ]}
          >
            <AppText color={isSelected ? colors.text.inverse : colors.text.primary} variant="caption">
              {filter.label}
            </AppText>
            <AppText color={isSelected ? colors.text.inverse : colors.text.muted} variant="caption">
              {filter.count}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl
  },
  header: {
    gap: spacing.xs
  },
  controls: {
    gap: spacing.md
  },
  fieldGroup: {
    gap: spacing.xs
  },
  input: {
    ...typography.bodyPrimary,
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    color: colors.text.primary,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  button: {
    flex: 1
  },
  categoryChip: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  categoryChipSelected: {
    backgroundColor: colors.action.focus
  },
  categoryChips: {
    gap: spacing.sm,
    paddingRight: spacing.md
  },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    ...typography.bodyPrimary,
    color: colors.text.primary,
    flex: 1,
    minHeight: 48
  },
  errorBox: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.md,
    padding: spacing.md
  },
  stateBox: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    padding: spacing.md
  },
  results: {
    gap: spacing.md
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  group: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md
  },
  pressed: {
    opacity: 0.72
  },
  attribution: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs
  },
  attributionText: {
    flex: 1
  }
});
