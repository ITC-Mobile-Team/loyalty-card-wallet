import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { ListRow } from "@/components/ui/ListRow";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { DuplicateImportStrategy } from "@/domain/sharing/SharingPorts";
import type { useBackupRestoreController } from "@/features/account/hooks/useBackupRestoreController";
import type { useLocalSecurityController } from "@/features/account/hooks/useLocalSecurityController";

type AccountLocalSummaryViewProps = {
  appName: string;
  appVersion: string;
  cardCount: number;
  backup: ReturnType<typeof useBackupRestoreController>;
  security: ReturnType<typeof useLocalSecurityController>;
  onConfirmExport: () => void;
  onConfirmRestore: () => void;
};

const duplicateStrategies: { label: string; value: DuplicateImportStrategy }[] = [
  { label: "Skip", value: "skip" },
  { label: "Replace", value: "replace" },
  { label: "Keep Both", value: "keepBoth" }
];

function DuplicateControl({
  disabled,
  value,
  onChange
}: {
  disabled: boolean;
  value: DuplicateImportStrategy;
  onChange: (value: DuplicateImportStrategy) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      {duplicateStrategies.map((strategy) => {
        const selected = value === strategy.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={disabled}
            key={strategy.value}
            onPress={() => onChange(strategy.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <AppText color={selected ? colors.text.inverse : colors.text.primary} variant="caption">
              {strategy.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AccountLocalSummaryView({
  appName,
  appVersion,
  cardCount,
  backup,
  security,
  onConfirmExport,
  onConfirmRestore
}: AccountLocalSummaryViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="titleLarge">Account</AppText>
        <AppText color={colors.text.secondary}>Local recovery and security.</AppText>
      </View>

      <View style={styles.group}>
        <ListRow detail="No sign-in required" title="Local-only wallet" />
        <ListRow detail={`${cardCount} saved card${cardCount === 1 ? "" : "s"}`} title="Cards on device" />
        <ListRow detail={`${appName} ${appVersion}`} title="App version" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="titleModal">Backup</AppText>
          <AppText color={colors.text.secondary}>
            Encrypted backups contain all card numbers and private images. Forgotten passphrases cannot be recovered.
          </AppText>
        </View>
        <TextInput
          accessibilityLabel="Backup passphrase"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!backup.busy}
          onChangeText={backup.setPassphrase}
          placeholder="Backup passphrase"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
          style={styles.input}
          value={backup.passphrase}
        />
        <TextInput
          accessibilityLabel="Confirm backup passphrase"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!backup.busy}
          onChangeText={backup.setConfirmation}
          placeholder="Confirm passphrase for export"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
          style={styles.input}
          value={backup.confirmation}
        />
        <View style={styles.buttonRow}>
          <AppButton
            disabled={backup.busy}
            label={backup.busy ? "Working..." : "Create Encrypted Backup"}
            onPress={onConfirmExport}
          />
          <AppButton
            disabled={backup.busy || backup.passphrase.length < 8}
            label="Choose Backup To Restore"
            onPress={() => void backup.previewRestore()}
            variant="secondary"
          />
        </View>

        {backup.candidate ? (
          <View style={styles.previewBox}>
            <AppText variant="bodyStrong">Restore preview</AppText>
            <AppText color={colors.text.secondary}>
              {backup.candidate.preview.cardCount} cards, {backup.candidate.preview.imageCount} images, payload v
              {backup.candidate.preview.sourcePayloadVersion} → v{backup.candidate.preview.currentPayloadVersion}.
            </AppText>
            <DuplicateControl
              disabled={backup.busy}
              onChange={backup.setDuplicateStrategy}
              value={backup.duplicateStrategy}
            />
            <AppButton disabled={backup.busy} label="Restore Previewed Cards" onPress={onConfirmRestore} />
          </View>
        ) : null}

        {backup.restoreResult ? (
          <View style={styles.resultList}>
            {backup.restoreResult.cards.map((card) => (
              <AppText color={colors.text.secondary} key={`${card.sourceIndex}-${card.storeName}`} variant="caption">
                {card.sourceIndex + 1}. {card.storeName}: {card.status}
                {card.reason ? ` (${card.reason})` : ""}
              </AppText>
            ))}
          </View>
        ) : null}
        {backup.status ? <AppText color={colors.text.secondary}>{backup.status}</AppText> : null}
        {backup.error ? <AppText color={colors.action.danger}>{backup.error}</AppText> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="titleModal">Security</AppText>
          <AppText color={colors.text.secondary}>
            Optional app lock protects on-screen access. It does not encrypt SQLite or private image payloads at rest.
          </AppText>
        </View>
        <View style={styles.group}>
          <ListRow
            detail={
              security.available && security.enrolled
                ? security.enabled
                  ? "Enabled · locks after 1 minute in background"
                  : "Available · disabled"
                : "Biometric or device credential unavailable"
            }
            title="Local app lock"
          />
        </View>
        <View style={styles.buttonRow}>
          <AppButton
            disabled={security.busy}
            label={security.enabled ? "Disable App Lock" : "Enable App Lock"}
            onPress={() => void security.toggle()}
            variant="secondary"
          />
          {security.enabled ? <AppButton label="Lock Now" onPress={security.lock} variant="secondary" /> : null}
        </View>
        {security.message ? <AppText color={colors.text.secondary}>{security.message}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  header: { gap: spacing.xs },
  group: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md
  },
  section: { gap: spacing.md },
  sectionHeader: { gap: spacing.xs },
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
  previewBox: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.sm,
    padding: spacing.md
  },
  resultList: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.xs,
    padding: spacing.md
  },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  segmentedControl: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surface.field,
    borderColor: colors.border.separator,
    borderRadius: radius.field,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: spacing.sm
  },
  segmentSelected: {
    backgroundColor: colors.action.focus,
    borderColor: colors.action.focus
  }
});
