import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/design/tokens";

type CardDetailPlaceholderViewProps = {
  cardId: string;
  onEdit: () => void;
  onScanMode: () => void;
};

export function CardDetailPlaceholderView({ cardId, onEdit, onScanMode }: CardDetailPlaceholderViewProps) {
  return (
    <View style={styles.container}>
      <AppText variant="titleLarge">Card</AppText>
      <View style={styles.panel}>
        <AppText color={colors.text.secondary}>Card ID</AppText>
        <AppText selectable variant="bodyStrong">
          {cardId}
        </AppText>
      </View>
      <View style={styles.actions}>
        <AppButton label="Scan Mode" onPress={onScanMode} />
        <AppButton label="Edit" onPress={onEdit} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl
  },
  panel: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    gap: spacing.xs,
    padding: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
