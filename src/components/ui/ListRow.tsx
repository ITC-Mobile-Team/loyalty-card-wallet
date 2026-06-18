import { Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/design/tokens";

import { AppText } from "./AppText";

type ListRowProps = {
  accessibilityLabel?: string;
  detail?: string;
  onPress?: () => void;
  title: string;
};

export function ListRow({ accessibilityLabel, detail, onPress, title }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <AppText variant="bodyStrong">{title}</AppText>
      {detail ? (
        <AppText color={colors.text.secondary} style={styles.detail}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? [title, detail].filter(Boolean).join(", ")}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: colors.border.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingVertical: spacing.md
  },
  detail: {
    marginTop: spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
