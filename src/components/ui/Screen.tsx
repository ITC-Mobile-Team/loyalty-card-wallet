import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/design/tokens";

type ScreenProps = ScrollViewProps & {
  padded?: boolean;
};

export function Screen({ children, contentContainerStyle, padded = true, ...props }: ScreenProps) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
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
