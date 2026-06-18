import { StyleSheet, View } from "react-native";

import { colors, spacing } from "@/design/tokens";

import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

type EmptyStateProps = {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, body, onAction, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title} variant="titleModal">
        {title}
      </AppText>
      <AppText color={colors.text.secondary} style={styles.body}>
        {body}
      </AppText>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl
  },
  title: {
    textAlign: "center"
  },
  body: {
    textAlign: "center"
  }
});
