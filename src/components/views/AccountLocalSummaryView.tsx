import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { ListRow } from "@/components/ui/ListRow";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type {
  DuplicateImportStrategy,
  ImportBundlePreview
} from "@/domain/sharing/SharingPorts";

type AccountLocalSummaryViewProps = {
  appName: string;
  appVersion: string;
  cardCount: number;
  duplicateStrategy: DuplicateImportStrategy;
  errorMessage?: string;
  exportBundleText: string;
  importBundleText: string;
  importPreview: ImportBundlePreview | null;
  isBusy: boolean;
  lastExportDetail: string;
  maintenanceDetail: string;
  onChangeDuplicateStrategy: (strategy: DuplicateImportStrategy) => void;
  onChangeImportBundleText: (text: string) => void;
  onClearImportBundle: () => void;
  onCleanUnusedImages: () => void;
  onExportAll: () => void;
  onImportBundle: () => void;
  onPreviewImport: () => void;
  onRefreshSummary: () => void;
  onShareExportBundle: () => void;
  statusMessage?: string;
};

const duplicateStrategies: { label: string; value: DuplicateImportStrategy }[] = [
  { label: "Skip", value: "skip" },
  { label: "Replace", value: "replace" },
  { label: "Keep Both", value: "keepBoth" }
];

export function AccountLocalSummaryView({
  appName,
  appVersion,
  cardCount,
  duplicateStrategy,
  errorMessage,
  exportBundleText,
  importBundleText,
  importPreview,
  isBusy,
  lastExportDetail,
  maintenanceDetail,
  onChangeDuplicateStrategy,
  onChangeImportBundleText,
  onClearImportBundle,
  onCleanUnusedImages,
  onExportAll,
  onImportBundle,
  onPreviewImport,
  onRefreshSummary,
  onShareExportBundle,
  statusMessage
}: AccountLocalSummaryViewProps) {
  const hasImportText = importBundleText.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="titleLarge">Account</AppText>
        <AppText color={colors.text.secondary}>
          Local account tools for backup, restore, privacy, and maintenance.
        </AppText>
      </View>

      <View style={styles.group}>
        <ListRow detail="No sign-in required for MVP" title="Local-only wallet" />
        <ListRow detail={`${cardCount} saved card${cardCount === 1 ? "" : "s"}`} title="Cards on device" />
        <ListRow detail={lastExportDetail} title="Last export" />
        <ListRow detail={`${appName} ${appVersion}`} title="App version" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="titleModal">Backup</AppText>
          <AppText color={colors.text.secondary}>
            Exported bundles include loyalty card numbers and private card images.
          </AppText>
        </View>
        <AppButton disabled={isBusy} label={isBusy ? "Working..." : "Export All Cards"} onPress={onExportAll} />
        {exportBundleText ? (
          <View style={styles.fieldGroup}>
            <AppText variant="bodyStrong">Generated bundle</AppText>
            <TextInput
              accessibilityLabel="Generated export bundle"
              editable={false}
              multiline
              scrollEnabled
              style={[styles.input, styles.bundleOutput]}
              value={exportBundleText}
            />
            <AppButton
              accessibilityLabel="Share export bundle"
              disabled={isBusy}
              label="Share Bundle"
              onPress={onShareExportBundle}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="titleModal">Restore</AppText>
          <AppText color={colors.text.secondary}>
            Paste a Loyalty Card Wallet JSON bundle to preview it before importing.
          </AppText>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bodyStrong">Import bundle</AppText>
          <TextInput
            accessibilityLabel="Import bundle JSON"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isBusy}
            multiline
            onChangeText={onChangeImportBundleText}
            placeholder="{ ... }"
            placeholderTextColor={colors.text.muted}
            style={[styles.input, styles.importInput]}
            textAlignVertical="top"
            value={importBundleText}
          />
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bodyStrong">Duplicate imports</AppText>
          <View style={styles.segmentedControl}>
            {duplicateStrategies.map((strategy) => {
              const selected = duplicateStrategy === strategy.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${strategy.label} duplicate imports`}
                  accessibilityState={{ selected }}
                  disabled={isBusy}
                  key={strategy.value}
                  onPress={() => onChangeDuplicateStrategy(strategy.value)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <AppText
                    color={selected ? colors.text.inverse : colors.text.primary}
                    style={styles.segmentLabel}
                    variant="caption"
                  >
                    {strategy.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {importPreview ? (
          <View style={styles.previewBox}>
            <AppText variant="bodyStrong">Preview</AppText>
            <AppText color={colors.text.secondary}>
              {importPreview.cardCount} cards, {importPreview.imageCount} images,{" "}
              {importPreview.duplicateCardCount} duplicates.
            </AppText>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <AppButton
            disabled={isBusy || !hasImportText}
            label="Preview Import"
            onPress={onPreviewImport}
            variant="secondary"
          />
          <AppButton disabled={isBusy || !hasImportText} label="Import Cards" onPress={onImportBundle} />
          {hasImportText ? (
            <AppButton disabled={isBusy} label="Clear Import" onPress={onClearImportBundle} variant="secondary" />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="titleModal">Maintenance</AppText>
          <AppText color={colors.text.secondary}>
            Local actions only. These do not send card data outside the app.
          </AppText>
        </View>
        <View style={styles.buttonRow}>
          <AppButton disabled={isBusy} label="Refresh Summary" onPress={onRefreshSummary} variant="secondary" />
          <AppButton
            disabled={isBusy}
            label="Clean Unused Images"
            onPress={onCleanUnusedImages}
            variant="secondary"
          />
        </View>
        <AppText color={colors.text.secondary} variant="caption">
          {maintenanceDetail}
        </AppText>
      </View>

      {statusMessage ? (
        <AppText accessibilityLiveRegion="polite" color={colors.text.secondary}>
          {statusMessage}
        </AppText>
      ) : null}
      {errorMessage ? (
        <AppText accessibilityLiveRegion="assertive" color={colors.action.danger}>
          {errorMessage}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl
  },
  header: {
    gap: spacing.xs
  },
  group: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md
  },
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    gap: spacing.xs
  },
  fieldGroup: {
    gap: spacing.xs
  },
  input: {
    ...typography.bodyPrimary,
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    color: colors.text.primary,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  importInput: {
    minHeight: 144
  },
  bundleOutput: {
    minHeight: 160
  },
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    minHeight: 40,
    minWidth: 92,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  segmentSelected: {
    backgroundColor: colors.action.focus,
    borderColor: colors.action.focus
  },
  segmentLabel: {
    textAlign: "center"
  },
  previewBox: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.xs,
    padding: spacing.md
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
