import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/design/tokens";

export function CardsGridSkeletonView() {
  return (
    <View style={styles.grid} accessibilityLabel="Loading cards">
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.tile}>
          <View style={styles.badge} />
          <View style={styles.lineGroup}>
            <View style={styles.lineLong} />
            <View style={styles.lineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  tile: {
    aspectRatio: 1.5,
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    justifyContent: "space-between",
    minHeight: 148,
    opacity: 0.72,
    padding: spacing.md,
    width: "47%"
  },
  badge: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.icon,
    height: 44,
    width: 44
  },
  lineGroup: {
    gap: spacing.xs
  },
  lineLong: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    height: 16,
    width: "88%"
  },
  lineShort: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    height: 12,
    width: "46%"
  }
});
