import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";

import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { useDependencies } from "@/core/di/useDependencies";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { MerchantCatalogSearchResult } from "@/domain/catalog/MerchantCatalog";

type AddCatalogScreenProps = {
  onSelect: (merchant: MerchantCatalogSearchResult | null) => void;
};

export function AddCatalogScreen({ onSelect }: AddCatalogScreenProps) {
  const { merchantCatalogRepository } = useDependencies();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MerchantCatalogSearchResult[]>([]);

  useEffect(() => {
    let active = true;
    void merchantCatalogRepository.search(query).then((entries) => {
      if (active) {
        setResults(entries);
      }
    });
    return () => {
      active = false;
    };
  }, [merchantCatalogRepository, query]);

  return (
    <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchField}>
        <Search color={colors.text.muted} size={20} />
        <TextInput
          accessibilityLabel="Search merchant catalog"
          onChangeText={setQuery}
          placeholder="Search merchants"
          placeholderTextColor={colors.text.muted}
          style={styles.searchInput}
          value={query}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(null)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.initials, { backgroundColor: colors.surface.field }]}>
          <AppText variant="bodyStrong">+</AppText>
        </View>
        <View style={styles.copy}>
          <AppText variant="bodyStrong">Other card</AppText>
          <AppText color={colors.text.secondary} variant="caption">Enter a merchant manually</AppText>
        </View>
      </Pressable>
      {results.map((entry) => (
        <Pressable
          accessibilityLabel={`${entry.name}, ${entry.category}`}
          accessibilityRole="button"
          key={entry.id}
          onPress={() => onSelect(entry)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={[styles.initials, { backgroundColor: entry.defaultBackgroundColor }]}>
            <AppText color={colors.text.inverse} variant="bodyStrong">
              {entry.name.slice(0, 2).toLocaleUpperCase("uk-UA")}
            </AppText>
          </View>
          <View style={styles.copy}>
            <AppText variant="bodyStrong">{entry.name}</AppText>
            <AppText color={colors.text.secondary} variant="caption">
              {entry.category}{entry.matchedAlias ? ` · matched ${entry.matchedAlias}` : ""}
            </AppText>
          </View>
        </Pressable>
      ))}
      {query && results.length === 0 ? (
        <AppText color={colors.text.secondary}>No catalog match. Other card remains available.</AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  copy: { flex: 1, gap: spacing.xxs },
  initials: {
    alignItems: "center",
    borderRadius: radius.field,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  pressed: { opacity: 0.76 },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 68,
    paddingVertical: spacing.xs
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
