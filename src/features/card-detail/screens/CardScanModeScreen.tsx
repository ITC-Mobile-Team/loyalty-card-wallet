import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { BarcodePanelView } from "@/components/views/BarcodePanelView";
import { colors, spacing } from "@/design/tokens";
import { formatCardNumberForDisplay } from "@/domain/cards/card-display";
import { useFocusedBrightnessBoost } from "@/features/barcode/hooks/useFocusedBrightnessBoost";
import { useRenderedBarcode } from "@/features/barcode/hooks/useRenderedBarcode";
import { useCardDetails } from "@/features/card-detail/hooks/useCardDetails";

type CardScanModeScreenProps = {
  cardId: string;
  onClose: () => void;
};

export function CardScanModeScreen({ cardId, onClose }: CardScanModeScreenProps) {
  const { card, error, isLoading, refresh } = useCardDetails(cardId);
  const barcodeInput = useMemo(
    () => (card ? { format: card.barcodeFormat, value: card.cardNumber } : null),
    [card]
  );
  const {
    barcode,
    error: barcodeError,
    isLoading: isBarcodeLoading,
    retry: retryBarcode
  } = useRenderedBarcode(barcodeInput);
  const displayValue = barcode?.displayValue ?? (card ? formatCardNumberForDisplay(card.cardNumber) : "");
  const formatLabel = card?.barcodeFormat.toUpperCase() ?? "BARCODE";
  useFocusedBrightnessBoost(Boolean(card));

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <AppButton label="Close" onPress={onClose} style={styles.closeButton} variant="secondary" />
      </View>
      {isLoading ? (
        <EmptyState body="Loading the saved card from local storage." title="Preparing Card" />
      ) : null}
      {error ? <EmptyState actionLabel="Retry" body={error.message} onAction={refresh} title="Card Could Not Load" /> : null}
      {!isLoading && !error && !card ? (
        <EmptyState body={`Card ${cardId} is no longer available.`} title="Card Not Found" />
      ) : null}
      {!isLoading && !error && card ? (
        <View style={styles.scanPanel}>
          <AppText color={colors.text.primary} style={styles.storeName} variant="titleModal">
            {card.storeName}
          </AppText>
          <BarcodePanelView
            barcode={barcode}
            displayValue={displayValue}
            error={barcodeError}
            formatLabel={formatLabel}
            isLoading={isBarcodeLoading}
            variant="scan"
          />
          {barcode?.supportsRotation ? (
            <BarcodePanelView
              barcode={barcode}
              displayValue={displayValue}
              error={barcodeError}
              formatLabel={`${formatLabel} ROTATED`}
              isLoading={isBarcodeLoading}
              variant="rotated"
            />
          ) : null}
          {barcodeError ? (
            <AppButton label="Retry Barcode" onPress={retryBarcode} variant="secondary" />
          ) : null}
          <AppText color={colors.text.secondary} style={styles.helpText} variant="caption">
            Use the brightest practical screen setting and keep the white barcode area unobstructed.
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    justifyContent: "center",
    paddingTop: spacing.xxl
  },
  topBar: {
    alignItems: "flex-end"
  },
  closeButton: {
    minWidth: 96
  },
  scanPanel: {
    gap: spacing.lg
  },
  storeName: {
    textAlign: "center"
  },
  helpText: {
    textAlign: "center"
  }
});
