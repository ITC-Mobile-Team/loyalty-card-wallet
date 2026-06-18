import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/design/tokens";

export const MAP_PREVIEW_UNAVAILABLE_TEXT = "Map preview unavailable. You can still open or copy the coordinates.";

export function MapPreviewFallback() {
  return (
    <View style={styles.fallback}>
      <AppText color={colors.text.secondary}>{MAP_PREVIEW_UNAVAILABLE_TEXT}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    padding: spacing.md
  }
});
