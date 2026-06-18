import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/design/tokens";

import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "danger";

type AppButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  variant?: AppButtonVariant;
};

export function AppButton({ accessibilityLabel, disabled, label, style, variant = "primary", ...props }: AppButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), ...props.accessibilityState }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <AppText color={getTextColor(variant)} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

function getTextColor(variant: AppButtonVariant) {
  return variant === "primary" ? colors.text.inverse : colors.text.primary;
}

const buttonBase: ViewStyle = {
  minHeight: 48,
  borderRadius: radius.field,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm
};

const styles = StyleSheet.create({
  base: buttonBase,
  primary: {
    backgroundColor: colors.action.focus
  },
  secondary: {
    backgroundColor: colors.surface.field
  },
  danger: {
    backgroundColor: colors.action.danger
  },
  pressed: {
    opacity: 0.82
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    ...typography.button,
    textAlign: "center"
  }
});
