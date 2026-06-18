import { Text, type TextProps, StyleSheet } from "react-native";

import { colors, typography } from "@/design/tokens";

type AppTextVariant = keyof typeof typography;

type AppTextProps = TextProps & {
  color?: string;
  variant?: AppTextVariant;
};

export function AppText({ color = colors.text.primary, style, variant = "bodyPrimary", ...props }: AppTextProps) {
  return <Text {...props} style={[styles.base, typography[variant], { color }, style]} />;
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0
  }
});
