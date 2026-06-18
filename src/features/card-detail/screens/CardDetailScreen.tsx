import { useEffect, useMemo } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { CardDetailView } from "@/components/views/CardDetailView";
import { CardsGridSkeletonView } from "@/components/views/CardsGridSkeletonView";
import { colors, spacing } from "@/design/tokens";
import { getCardNumberSuffix } from "@/domain/cards/card-display";
import { useRenderedBarcode } from "@/features/barcode/hooks/useRenderedBarcode";
import { useCardDetails } from "@/features/card-detail/hooks/useCardDetails";
import { useShareCardLink } from "@/features/sharing/useShareCardLink";

type CardDetailScreenProps = {
  cardId: string;
  onDeleted: () => void;
  onEdit: () => void;
  onScanMode: () => void;
  refreshSignal?: number;
};

type DetailAction = {
  cancel?: boolean;
  destructive?: boolean;
  key: "scanMode" | "share" | "edit" | "delete" | "cancel";
  label: string;
};

const detailActions: readonly DetailAction[] = [
  { key: "scanMode", label: "Scan Mode" },
  { key: "share", label: "Share Card" },
  { key: "edit", label: "Edit Card" },
  { key: "delete", label: "Delete Card", destructive: true },
  { key: "cancel", label: "Cancel", cancel: true }
] as const;

type DetailActionKey = DetailAction["key"];

export function CardDetailScreen({
  cardId,
  onDeleted,
  onEdit,
  onScanMode,
  refreshSignal = 0
}: CardDetailScreenProps) {
  const { card, deleteCard, error, images, isDeleting, isLoading, refresh } = useCardDetails(cardId);
  const {
    error: shareError,
    isSharing,
    share,
    shareStatusMessage
  } = useShareCardLink(cardId);
  const barcodeInput = useMemo(
    () => (card ? { format: card.barcodeFormat, value: card.cardNumber } : null),
    [card]
  );
  const {
    barcode,
    error: barcodeError,
    isLoading: isBarcodeLoading
  } = useRenderedBarcode(barcodeInput);

  useEffect(() => {
    if (refreshSignal > 0) {
      void refresh();
    }
  }, [refresh, refreshSignal]);

  async function handleDeleteConfirmed() {
    const deleted = await deleteCard();

    if (deleted) {
      onDeleted();
    }
  }

  function handleDelete() {
    const suffix = card ? getCardNumberSuffix(card.cardNumber) : "";
    const suffixText = suffix ? ` ending in ${suffix}` : "";

    Alert.alert(
      "Delete card?",
      `Delete ${card?.storeName ?? "this card"}${suffixText} from this device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDeleteConfirmed();
          }
        }
      ]
    );
  }

  function handleShare() {
    void share();
  }

  function runDetailAction(action: DetailActionKey) {
    const handlers: Record<DetailActionKey, () => void> = {
      cancel: () => undefined,
      delete: handleDelete,
      edit: onEdit,
      scanMode: onScanMode,
      share: handleShare
    };

    handlers[action]();
  }

  function handleOpenActions() {
    const options = detailActions.map((action) => action.label);
    const cancelButtonIndex = detailActions.findIndex((action) => action.cancel);
    const destructiveButtonIndex = detailActions.findIndex((action) => action.destructive);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex,
          destructiveButtonIndex,
          options,
          title: card?.storeName
        },
        (buttonIndex) => {
          runDetailAction(detailActions[buttonIndex]?.key ?? "cancel");
        }
      );
      return;
    }

    Alert.alert(card?.storeName ?? "Card actions", "Choose an action for this card.", [
      ...detailActions
        .filter((action) => !action.cancel)
        .map((action) => ({
          text: action.label,
          onPress: () => runDetailAction(action.key),
          style: action.destructive ? ("destructive" as const) : ("default" as const)
        })),
      { text: "Cancel", style: "cancel" as const }
    ]);
  }

  return (
    <Screen contentContainerStyle={{ gap: spacing.xl }}>
      {isLoading && !card ? <CardsGridSkeletonView /> : null}
      {error && !card ? (
        <>
          <EmptyState actionLabel="Retry" body={error.message} onAction={refresh} title="Card Could Not Load" />
          <AppText color={colors.text.secondary}>Card ID: {cardId}</AppText>
        </>
      ) : null}
      {!isLoading && !error && !card ? (
        <EmptyState body="This card is no longer in the local wallet." title="Card Not Found" />
      ) : null}
      {card ? (
        <CardDetailView
          barcode={barcode}
          barcodeError={barcodeError}
          card={card}
          imageCount={images.imageCount}
          imageUri={images.primaryImageUri}
          isBarcodeLoading={isBarcodeLoading}
          onOpenActions={isDeleting || isSharing ? () => undefined : handleOpenActions}
        />
      ) : null}
      {isSharing ? <AppText color={colors.text.secondary}>Preparing share link...</AppText> : null}
      {shareStatusMessage ? <AppText color={colors.text.secondary}>{shareStatusMessage}</AppText> : null}
      {shareError ? <AppText color={colors.text.secondary}>{shareError.message}</AppText> : null}
      {isLoading && card ? <AppText color={colors.text.secondary}>Refreshing card...</AppText> : null}
      {error && card ? <AppText color={colors.text.secondary}>Could not refresh card.</AppText> : null}
    </Screen>
  );
}
