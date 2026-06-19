import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/design/tokens";
import type { AppError } from "@/core/errors/AppError";
import type { RenderedBarcode } from "@/domain/barcode/BarcodeRenderer";

type BarcodePanelVariant = "detail" | "scan" | "rotated";

type BarcodePanelViewProps = {
  barcode: RenderedBarcode | null;
  displayValue: string;
  error?: AppError | null;
  formatLabel: string;
  isLoading?: boolean;
  onCopyDisplayValue?: () => void;
  variant?: BarcodePanelVariant;
};

export function BarcodePanelView({
  barcode,
  displayValue,
  error = null,
  formatLabel,
  isLoading = false,
  onCopyDisplayValue,
  variant = "detail"
}: BarcodePanelViewProps) {
  const hasBarcode = barcode && !error;

  return (
    <View
      accessible
      accessibilityLabel={`${formatLabel} barcode for ${displayValue}`}
      accessibilityRole="image"
      style={[styles.surface, variant === "scan" && styles.scanSurface, variant === "rotated" && styles.rotatedSurface]}
    >
      {isLoading ? (
        <View style={[styles.graphic, styles.messageGraphic, variant === "scan" && styles.scanGraphic]}>
          <AppText color={colors.text.inverse} style={styles.centeredText} variant="bodyStrong">
            Preparing barcode
          </AppText>
        </View>
      ) : null}

      {!isLoading && hasBarcode ? (
        <View style={variant === "rotated" ? styles.rotatedViewport : undefined}>
          <View
            style={[
              styles.graphic,
              variant === "scan" && styles.scanGraphic,
              variant === "rotated" && styles.rotatedGraphic
            ]}
          >
            {barcode.bars.map((bar, index) => (
              <View
                key={`${bar.x}-${bar.width}-${index}`}
                style={[
                  styles.bar,
                  {
                    left: `${(bar.x / barcode.moduleCount) * 100}%`,
                    width: `${(bar.width / barcode.moduleCount) * 100}%`
                  }
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!isLoading && !hasBarcode ? (
        <View style={[styles.graphic, styles.messageGraphic, variant === "scan" && styles.scanGraphic]}>
          <AppText color={colors.text.inverse} style={styles.centeredText} variant="bodyStrong">
            Barcode cannot be rendered
          </AppText>
          {error ? (
            <AppText color={colors.text.inverse} style={styles.centeredText} variant="caption">
              {error.message}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.numberRow}>
        <AppText color={colors.text.inverse} style={styles.cardNumber} selectable variant="bodyStrong">
          {displayValue}
        </AppText>
        {onCopyDisplayValue ? (
          <Pressable
            accessibilityLabel="Copy card number"
            accessibilityRole="button"
            onPress={onCopyDisplayValue}
            style={({ pressed }) => [styles.copyChip, pressed && styles.copyChipPressed]}
          >
            <AppText color={colors.text.inverse} style={styles.copyChipText} variant="caption">
              Copy
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.formatBlock}>
        <AppText color={colors.text.inverse} style={styles.formatLabel} variant="caption">
          {formatLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface.barcode,
    borderRadius: radius.card + 4,
    gap: spacing.lg,
    padding: spacing.xl
  },
  scanSurface: {
    gap: spacing.lg,
    padding: spacing.xl
  },
  rotatedSurface: {
    alignItems: "center",
    minHeight: 320
  },
  graphic: {
    backgroundColor: colors.surface.barcode,
    height: 150,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  messageGraphic: {
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  scanGraphic: {
    height: 184
  },
  rotatedViewport: {
    alignItems: "center",
    height: 224,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%"
  },
  rotatedGraphic: {
    height: 132,
    transform: [{ rotate: "90deg" }],
    width: 224
  },
  bar: {
    backgroundColor: colors.text.inverse,
    bottom: 0,
    position: "absolute",
    top: 0
  },
  numberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  cardNumber: {
    flex: 1,
    fontSize: 25,
    fontWeight: "700",
    lineHeight: 30
  },
  copyChip: {
    alignItems: "center",
    backgroundColor: "#ECECEF",
    borderRadius: 999,
    minHeight: 36,
    minWidth: 60,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  copyChipPressed: {
    opacity: 0.72
  },
  copyChipText: {
    fontWeight: "700"
  },
  formatBlock: {
    gap: spacing.xxs
  },
  formatLabel: {
    fontWeight: "700",
    textAlign: "center"
  },
  centeredText: {
    textAlign: "center"
  }
});
