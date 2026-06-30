import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors, spacing } from "@/design/tokens";

type ScreenProps = ScrollViewProps & {
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  keyboardAvoidingBehavior?: KeyboardAvoidingViewProps["behavior"];
  keyboardVerticalOffset?: number;
  padded?: boolean;
};

export function Screen({
  children,
  contentContainerStyle,
  edges = ["bottom", "left", "right"],
  keyboardAvoiding = false,
  keyboardAvoidingBehavior = Platform.OS === "ios" ? "padding" : "height",
  keyboardVerticalOffset = 0,
  padded = true,
  ...props
}: ScreenProps) {
  const scrollView = (
    <ScrollView
      {...props}
      contentContainerStyle={[styles.content, padded && styles.padded, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={keyboardAvoidingBehavior}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={styles.keyboardAvoiding}
          enabled
        >
          {scrollView}
        </KeyboardAvoidingView>
      ) : (
        scrollView
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.app
  },
  keyboardAvoiding: {
    flex: 1
  },
  content: {
    flexGrow: 1
  },
  padded: {
    padding: spacing.md
  }
});
