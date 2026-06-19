import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/design/tokens";

export function CardsGridSkeletonView() {
  return (
    <View style={styles.stack} accessibilityLabel="Loading cards">
      <View style={styles.featuredTile}>
        <View style={styles.pill} />
        <View style={styles.featuredLineGroup}>
          <View style={styles.lineShort} />
          <View style={styles.titleLine} />
        </View>
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.rowTile}>
          <View style={styles.badge} />
          <View style={styles.rowLineGroup}>
            <View style={styles.lineLong} />
            <View style={styles.lineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm
  },
  featuredTile: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card + 12,
    justifyContent: "space-between",
    minHeight: 228,
    opacity: 0.72,
    padding: spacing.lg
  },
  rowTile: {
    alignItems: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card + 6,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 86,
    opacity: 0.72,
    padding: spacing.sm
  },
  badge: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.icon,
    height: 56,
    width: 56
  },
  pill: {
    backgroundColor: colors.surface.field,
    borderRadius: 999,
    height: 28,
    width: 150
  },
  featuredLineGroup: {
    gap: spacing.xs
  },
  rowLineGroup: {
    flex: 1,
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
  },
  titleLine: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    height: 28,
    width: "62%"
  }
});
