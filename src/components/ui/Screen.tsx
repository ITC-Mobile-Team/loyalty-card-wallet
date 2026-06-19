import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors, spacing } from "@/design/tokens";

type ScreenProps = ScrollViewProps & {
  edges?: Edge[];
  padded?: boolean;
};

export function Screen({
  children,
  contentContainerStyle,
  edges = ["bottom", "left", "right"],
  padded = true,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <ScrollView
        {...props}
        contentContainerStyle={[styles.content, padded && styles.padded, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.app
  },
  content: {
    flexGrow: 1
  },
  padded: {
    padding: spacing.md
  }
});
