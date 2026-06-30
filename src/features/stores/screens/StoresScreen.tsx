import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Search, MapPin } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { useStores } from "@/features/stores/hooks/useStores";
import type { CardMerchant, MerchantLink, NearbySuggestion } from "@/domain/stores/MerchantLinks";
import {
  buildStoreCategoryFilters,
  filterStoresByCategory,
  type StoreCategoryFilter
} from "@/features/stores/storeCategoryFilters";

export function StoresScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null);
  const {
    cardMerchants,
    city,
    confirmSuggestion,
    correctMerchantLink,
    dismissSuggestion,
    error,
    isLoading,
    isUsingLocation,
    merchantLinks,
    nearbyOutcomes,
    nearbySuggestions,
    searchTerm,
    setCity,
    setMerchantLinkEnabled,
    setSearchTerm,
    sourceAttribution,
    stores,
    total,
    requestCurrentLocation,
    refresh,
    removeMerchantLink,
    repairSuggestion,
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

      {nearbySuggestions.length > 0 ? (
        <View style={styles.results}>
          <View style={styles.sectionHeader}>
            <AppText variant="bodyStrong">Nearby Card Suggestions</AppText>
            <AppText color={colors.text.secondary} variant="caption">
              Suggestions require confirmation
            </AppText>
          </View>
          {nearbySuggestions.map((suggestion) => (
            <NearbySuggestionCard
              cardMerchants={cardMerchants}
              correctionOpen={correctionTargetId === `store:${suggestion.store.id}`}
              key={`${suggestion.kind}:${suggestion.store.id}`}
              onConfirm={(merchantKey) => {
                setCorrectionTargetId(null);
                if (suggestion.kind === "confirmed") {
                  void correctMerchantLink(suggestion.link.id, merchantKey);
                } else {
                  void confirmSuggestion(suggestion.store, merchantKey);
                }
              }}
              onDismiss={(merchantKey) => {
                setCorrectionTargetId(null);
                void dismissSuggestion(suggestion.store, merchantKey);
              }}
              onOpenCard={(cardId) => router.push(`/card/${encodeURIComponent(cardId)}`)}
              onRepair={(linkId) => {
                setCorrectionTargetId(null);
                void repairSuggestion(linkId, suggestion.store);
              }}
              onToggleCorrection={() =>
                setCorrectionTargetId((current) =>
                  current === `store:${suggestion.store.id}` ? null : `store:${suggestion.store.id}`
                )
              }
              suggestion={suggestion}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && !error && nearbyOutcomes.length > 0 && nearbySuggestions.length === 0 ? (
        <View style={styles.stateBox}>
          <AppText variant="bodyStrong">No card suggestion needs attention</AppText>
          <AppText color={colors.text.secondary}>
            No safe match was found, or the available suggestion was dismissed or disabled. Your saved cards remain
            available from Cards.
          </AppText>
        </View>
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

      {merchantLinks.length > 0 ? (
        <MerchantLinksSection
          cardMerchants={cardMerchants}
          correctionLinkId={
            correctionTargetId?.startsWith("link:") ? correctionTargetId.slice("link:".length) : null
          }
          links={merchantLinks}
          onCorrect={(link, merchantKey) => {
            setCorrectionTargetId(null);
            void correctMerchantLink(link.id, merchantKey);
          }}
          onRemove={(link) => {
            Alert.alert(
              "Remove Merchant Link?",
              `${link.displayName} will no longer use this confirmed store association.`,
              [
                { style: "cancel", text: "Cancel" },
                {
                  onPress: () => void removeMerchantLink(link.id),
                  style: "destructive",
                  text: "Remove"
                }
              ]
            );
          }}
          onSetEnabled={(link, enabled) => void setMerchantLinkEnabled(link.id, enabled)}
          onToggleCorrection={(link) =>
            setCorrectionTargetId((current) =>
              current === `link:${link.id}` ? null : `link:${link.id}`
            )
          }
        />
      ) : null}
    </Screen>
  );
}

function NearbySuggestionCard({
  cardMerchants,
  correctionOpen,
  onConfirm,
  onDismiss,
  onOpenCard,
  onRepair,
  onToggleCorrection,
  suggestion
}: {
  cardMerchants: CardMerchant[];
  correctionOpen: boolean;
  onConfirm: (merchantKey: string) => void;
  onDismiss: (merchantKey: string) => void;
  onOpenCard: (cardId: string) => void;
  onRepair: (linkId: string) => void;
  onToggleCorrection: () => void;
  suggestion: NearbySuggestion;
}) {
  const proposedMerchant =
    suggestion.kind === "ambiguous"
      ? suggestion.candidates[0]?.merchant
      : suggestion.kind === "confirmed"
        ? suggestion.merchant
        : suggestion.candidate.merchant;
  const detail =
    suggestion.kind === "confirmed"
      ? `Confirmed link • ${suggestion.store.name}`
      : suggestion.kind === "staleSource"
        ? `Stale store reference • ${suggestion.store.name}`
        : suggestion.kind === "ambiguous"
          ? `Ambiguous suggestion • ${suggestion.store.name}`
          : `Suggestion • ${suggestion.store.name}`;

  return (
    <View style={styles.suggestionCard}>
      <AppText color={colors.action.focus} variant="caption">
        {suggestion.kind === "confirmed" ? "CONFIRMED" : "SUGGESTION"}
      </AppText>
      <AppText variant="bodyStrong">{proposedMerchant?.displayName ?? suggestion.store.name}</AppText>
      <AppText color={colors.text.secondary}>{detail}</AppText>

      {suggestion.kind === "confirmed" ? (
        <>
          <View style={styles.compactGroup}>
            {suggestion.merchant.cards.map((card) => (
              <ListRow
                detail={`Card ending ${card.cardNumberSuffix}`}
                key={card.cardId}
                onPress={() => onOpenCard(card.cardId)}
                title={card.storeName}
              />
            ))}
          </View>
          <View style={styles.actionRow}>
            <AppButton
              label="Correct"
              onPress={onToggleCorrection}
              style={styles.actionButton}
              variant="secondary"
            />
          </View>
        </>
      ) : (
        <View style={styles.actionRow}>
          {suggestion.kind === "staleSource" ? (
            <AppButton
              label="Repair Link"
              onPress={() => onRepair(suggestion.link.id)}
              style={styles.actionButton}
            />
          ) : proposedMerchant ? (
            <AppButton
              label="Confirm"
              onPress={() => onConfirm(proposedMerchant.merchantKey)}
              style={styles.actionButton}
            />
          ) : null}
          <AppButton
            label="Correct"
            onPress={onToggleCorrection}
            style={styles.actionButton}
            variant="secondary"
          />
          {proposedMerchant ? (
            <AppButton
              label="Dismiss"
              onPress={() => onDismiss(proposedMerchant.merchantKey)}
              style={styles.actionButton}
              variant="secondary"
            />
          ) : null}
        </View>
      )}

      {correctionOpen ? (
        <MerchantCorrectionList merchants={cardMerchants} onConfirm={onConfirm} />
      ) : null}
    </View>
  );
}

function MerchantCorrectionList({
  merchants,
  onConfirm
}: {
  merchants: CardMerchant[];
  onConfirm: (merchantKey: string) => void;
}) {
  return (
    <View style={styles.correctionList}>
      <AppText color={colors.text.secondary} variant="caption">
        Choose the saved card merchant that belongs to this store.
      </AppText>
      <View style={styles.compactGroup}>
        {merchants.map((merchant) => (
          <ListRow
            detail={`${merchant.cards.length} saved ${merchant.cards.length === 1 ? "card" : "cards"}`}
            key={merchant.merchantKey}
            onPress={() => onConfirm(merchant.merchantKey)}
            title={merchant.displayName}
          />
        ))}
      </View>
    </View>
  );
}

function MerchantLinksSection({
  cardMerchants,
  correctionLinkId,
  links,
  onCorrect,
  onRemove,
  onSetEnabled,
  onToggleCorrection
}: {
  cardMerchants: CardMerchant[];
  correctionLinkId: string | null;
  links: MerchantLink[];
  onCorrect: (link: MerchantLink, merchantKey: string) => void;
  onRemove: (link: MerchantLink) => void;
  onSetEnabled: (link: MerchantLink, enabled: boolean) => void;
  onToggleCorrection: (link: MerchantLink) => void;
}) {
  return (
    <View style={styles.results}>
      <View style={styles.sectionHeader}>
        <AppText variant="bodyStrong">Merchant Links</AppText>
        <AppText color={colors.text.secondary} variant="caption">
          User-owned and removable
        </AppText>
      </View>
      {links.map((link) => (
        <View key={link.id} style={styles.suggestionCard}>
          <AppText variant="bodyStrong">{link.displayName}</AppText>
          <AppText color={colors.text.secondary}>
            {link.enabled ? "Suggestions enabled" : "Suggestions disabled"}
            {link.sourceReference
              ? ` • OSM ${link.sourceReference.type}/${link.sourceReference.id}`
              : ""}
          </AppText>
          <View style={styles.actionRow}>
            <AppButton
              label="Correct"
              onPress={() => onToggleCorrection(link)}
              style={styles.actionButton}
              variant="secondary"
            />
            <AppButton
              label={link.enabled ? "Disable" : "Re-enable"}
              onPress={() => onSetEnabled(link, !link.enabled)}
              style={styles.actionButton}
              variant="secondary"
            />
            <AppButton
              label="Remove"
              onPress={() => onRemove(link)}
              style={styles.actionButton}
              variant="danger"
            />
          </View>
          {correctionLinkId === link.id ? (
            <MerchantCorrectionList
              merchants={cardMerchants}
              onConfirm={(merchantKey) => onCorrect(link, merchantKey)}
            />
          ) : null}
        </View>
      ))}
    </View>
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
  sectionHeader: {
    gap: spacing.xxs
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
  },
  suggestionCard: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.sm,
    padding: spacing.md
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 104
  },
  correctionList: {
    gap: spacing.sm
  },
  compactGroup: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md
  }
});
