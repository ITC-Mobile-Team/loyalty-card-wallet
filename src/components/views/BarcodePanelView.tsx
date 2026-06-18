import { StyleSheet, View } from "react-native";

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
  variant?: BarcodePanelVariant;
};

export function BarcodePanelView({
  barcode,
  displayValue,
  error = null,
  formatLabel,
  isLoading = false,
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

      <View style={styles.copyBlock}>
        <AppText color={colors.text.inverse} style={styles.cardNumber} selectable variant="bodyStrong">
          {displayValue}
        </AppText>
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
    borderRadius: radius.barcode,
    gap: spacing.md,
    padding: spacing.lg
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
    height: 132,
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
  copyBlock: {
    gap: spacing.xxs
  },
  cardNumber: {
    textAlign: "center"
  },
  formatLabel: {
    textAlign: "center"
  },
  centeredText: {
    textAlign: "center"
  }
});
