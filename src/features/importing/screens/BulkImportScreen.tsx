import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { BARCODE_CAPABILITY_REGISTRY } from "@/domain/barcode/BarcodeCapabilities";
import type { BarcodeFormat } from "@/domain/cards/Card";
import type { ImportDraft, ImportDraftStatus } from "@/domain/importing/ImportSession";
import { useBulkImport } from "@/features/importing/hooks/useBulkImport";

type BulkImportScreenProps = {
  onCompleted: () => void;
};

type DraftFilter = "all" | "ready" | "needs_attention" | "duplicate" | "failed";

const filters: readonly { label: string; value: DraftFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Needs attention", value: "needs_attention" },
  { label: "Duplicates", value: "duplicate" },
  { label: "Failed", value: "failed" }
];

const persistableFormats = BARCODE_CAPABILITY_REGISTRY.filter((item) => item.persistable).map(
  (item) => item.format
);

export function BulkImportScreen({ onCompleted }: BulkImportScreenProps) {
  const { cancel, choosePhotos, commit, drafts, error, isBusy, session, updateDraft } = useBulkImport();
  const [filter, setFilter] = useState<DraftFilter>("all");
  const visibleDrafts = useMemo(
    () => drafts.filter((draft) => filter === "all" || draft.status === filter),
    [drafts, filter]
  );
  const readyCount = drafts.filter((draft) => draft.status === "ready").length;
  const duplicateCount = drafts.filter((draft) => draft.status === "duplicate").length;

  async function handleCommit(includeDuplicates: boolean) {
    const results = await commit(includeDuplicates);

    if (results.some((result) => result.status === "imported") && results.every((result) => !result.retryable)) {
      onCompleted();
    }
  }

  return (
    <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <AppText variant="titleModal">Import Screenshots</AppText>
        <AppText color={colors.text.secondary}>
          Select up to 50 images. Only normalized barcode drafts are stored; source screenshots are not retained.
        </AppText>
      </View>

      {!session ? (
        <View style={styles.emptyPanel}>
          <AppText variant="bodyStrong">Start a migration session</AppText>
          <AppText color={colors.text.secondary}>
            You can review detected cards, correct merchant names, and save successful items independently.
          </AppText>
          <AppButton
            disabled={isBusy}
            label={isBusy ? "Loading..." : "Choose Screenshots"}
            onPress={choosePhotos}
          />
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <AppText variant="bodyStrong">
              {drafts.length} of {session.totalSources} processed
            </AppText>
            <AppText color={colors.text.secondary}>
              {readyCount} ready · {duplicateCount} duplicate ·{" "}
              {drafts.filter((draft) => draft.status === "failed").length} failed
            </AppText>
          </View>

          <View accessibilityRole="tablist" style={styles.filters}>
            {filters.map((item) => {
              const selected = filter === item.value;
              const count = item.value === "all"
                ? drafts.length
                : drafts.filter((draft) => draft.status === item.value).length;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={[styles.filter, selected && styles.filterSelected]}
                >
                  <AppText color={selected ? colors.text.inverse : colors.text.primary} variant="caption">
                    {item.label} {count}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.draftList}>
            {visibleDrafts.map((draft) => (
              <ImportDraftEditor disabled={isBusy} draft={draft} key={draft.id} onReview={updateDraft} />
            ))}
          </View>

          <View style={styles.actions}>
            <AppButton
              disabled={isBusy || readyCount === 0}
              label={`Save ${readyCount} Ready`}
              onPress={() => handleCommit(false)}
            />
            {duplicateCount > 0 ? (
              <AppButton
                disabled={isBusy}
                label={`Save Ready + ${duplicateCount} Duplicates`}
                onPress={() => handleCommit(true)}
                variant="secondary"
              />
            ) : null}
            <AppButton disabled={isBusy} label="Replace Selection" onPress={choosePhotos} variant="secondary" />
            <AppButton disabled={isBusy} label="Cancel Session" onPress={cancel} variant="secondary" />
          </View>
        </>
      )}

      {error ? <AppText color={colors.action.danger}>{error.message}</AppText> : null}
    </Screen>
  );
}

function ImportDraftEditor({
  disabled,
  draft,
  onReview
}: {
  disabled: boolean;
  draft: ImportDraft;
  onReview: (
    draft: ImportDraft,
    values: { barcodeFormat?: BarcodeFormat; cardNumber?: string; storeName?: string }
  ) => Promise<void>;
}) {
  const [storeName, setStoreName] = useState(draft.storeName ?? "");
  const [cardNumber, setCardNumber] = useState(draft.cardNumber ?? "");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat | undefined>(draft.barcodeFormat);

  return (
    <View style={styles.draft}>
      <View style={styles.draftHeader}>
        <View style={styles.draftCopy}>
          <AppText numberOfLines={1} variant="bodyStrong">{draft.sourceName}</AppText>
          <AppText color={statusColor(draft.status)} variant="caption">{statusLabel(draft.status)}</AppText>
        </View>
        <AppText color={colors.text.muted} variant="caption">#{draft.sourceIndex + 1}</AppText>
      </View>

      {draft.status === "failed" && !draft.cardNumber ? (
        <AppText color={colors.action.danger}>{draft.errorMessage}</AppText>
      ) : (
        <>
          <TextInput
            accessibilityLabel={`Store name for ${draft.sourceName}`}
            editable={!disabled}
            onChangeText={setStoreName}
            placeholder="Store name"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            value={storeName}
          />
          <TextInput
            accessibilityLabel={`Card number for ${draft.sourceName}`}
            autoCapitalize="none"
            editable={!disabled}
            onChangeText={setCardNumber}
            placeholder="Card number"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            value={cardNumber}
          />
          <View style={styles.formats}>
            {persistableFormats.map((format) => {
              const selected = format === barcodeFormat;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  disabled={disabled}
                  key={format}
                  onPress={() => setBarcodeFormat(format)}
                  style={[styles.format, selected && styles.formatSelected]}
                >
                  <AppText color={selected ? colors.text.inverse : colors.text.primary} variant="caption">
                    {format.toUpperCase()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {draft.errorMessage ? <AppText color={colors.action.danger}>{draft.errorMessage}</AppText> : null}
          {draft.duplicateCardId ? (
            <AppText color={colors.text.secondary}>A matching card already exists. It will be kept separately.</AppText>
          ) : null}
          <AppButton
            disabled={disabled}
            label="Review Item"
            onPress={() => onReview(draft, { barcodeFormat, cardNumber, storeName })}
            variant="secondary"
          />
        </>
      )}
    </View>
  );
}

function statusLabel(status: ImportDraftStatus): string {
  return {
    duplicate: "Duplicate",
    failed: "Failed",
    imported: "Imported",
    needs_attention: "Needs attention",
    ready: "Ready"
  }[status];
}

function statusColor(status: ImportDraftStatus): string {
  if (status === "failed") return colors.action.danger;
  if (status === "ready" || status === "imported") return "#76F1B3";
  return colors.text.secondary;
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  content: { gap: spacing.lg },
  draft: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    gap: spacing.sm,
    padding: spacing.md
  },
  draftCopy: { flex: 1, gap: spacing.xxs },
  draftHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  draftList: { gap: spacing.sm },
  emptyPanel: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    gap: spacing.md,
    padding: spacing.md
  },
  filter: {
    backgroundColor: colors.surface.field,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  filterSelected: { backgroundColor: colors.action.focus },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  format: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  formatSelected: { backgroundColor: colors.action.focus },
  formats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  header: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.field,
    color: colors.text.primary,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    ...typography.bodyPrimary
  },
  summary: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.card,
    gap: spacing.xs,
    padding: spacing.md
  }
});
