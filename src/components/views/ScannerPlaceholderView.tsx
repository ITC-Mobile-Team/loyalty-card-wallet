import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/design/tokens";

type ScannerPlaceholderViewProps = {
  onChooseFromCatalog: () => void;
  onEnterManually: () => void;
  onImportPhoto: () => void;
};

export function ScannerPlaceholderView({
  onChooseFromCatalog,
  onEnterManually,
  onImportPhoto
}: ScannerPlaceholderViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <AppText style={styles.frameText} variant="titleModal">
          Scanner Placeholder
        </AppText>
        <AppText color={colors.text.secondary} style={styles.frameText}>
          Camera scanning will be implemented in the scanner phase.
        </AppText>
      </View>
      <View style={styles.actions}>
        <AppButton label="Enter Manually" onPress={onEnterManually} variant="secondary" />
        <AppButton label="Choose Merchant" onPress={onChooseFromCatalog} variant="secondary" />
        <AppButton label="Import Photo" onPress={onImportPhoto} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: "center"
  },
  frame: {
    alignItems: "center",
    borderColor: colors.action.focus,
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.sm,
    minHeight: 260,
    justifyContent: "center",
    padding: spacing.lg
  },
  frameText: {
    textAlign: "center"
  },
  actions: {
    gap: spacing.sm
  }
});
