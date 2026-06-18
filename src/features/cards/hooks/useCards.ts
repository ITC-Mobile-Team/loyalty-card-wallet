import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { LoyaltyCard } from "@/domain/cards/Card";
import type { ImageStore } from "@/domain/images/ImageStore";
import { imagePayloadToDataUri } from "@/features/images/image-data-uri";

export type CardListItem = {
  card: LoyaltyCard;
  imageUri?: string;
};

type CardsState = {
  cards: CardListItem[];
  error: AppError | null;
  isLoading: boolean;
};

type RefreshOptions = {
  silent?: boolean;
};

function areCardListItemsEqual(left: CardListItem[], right: CardListItem[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftItem, index) => {
    const rightItem = right[index];

    return (
      rightItem !== undefined &&
      leftItem.imageUri === rightItem.imageUri &&
      leftItem.card.id === rightItem.card.id &&
      leftItem.card.storeName === rightItem.card.storeName &&
      leftItem.card.cardNumber === rightItem.card.cardNumber &&
      leftItem.card.barcodeFormat === rightItem.card.barcodeFormat &&
      leftItem.card.backgroundColor === rightItem.card.backgroundColor &&
      leftItem.card.primaryImageId === rightItem.card.primaryImageId &&
      leftItem.card.thumbnailImageId === rightItem.card.thumbnailImageId &&
      leftItem.card.updatedAt === rightItem.card.updatedAt
    );
  });
}

async function toCardListItem(card: LoyaltyCard, imageStore: ImageStore): Promise<CardListItem> {
  const imageId = card.thumbnailImageId ?? card.primaryImageId;
  const payload = imageId ? await imageStore.getImage(imageId) : null;

  return {
    card,
    imageUri: payload ? imagePayloadToDataUri(payload) : undefined
  };
}

async function toCardListItems(cards: LoyaltyCard[], imageStore: ImageStore): Promise<CardListItem[]> {
  return Promise.all(cards.map((card) => toCardListItem(card, imageStore)));
}

export function useCards() {
  const { cardRepository, errorReporter, imageStore } = useDependencies();
  const [state, setState] = useState<CardsState>({
    cards: [],
    error: null,
    isLoading: true
  });

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    if (!options.silent) {
      setState((current) => ({ ...current, isLoading: true }));
    }

    try {
      const cards = await toCardListItems(await cardRepository.list(), imageStore);
      setState((current) => {
        if (options.silent && current.error === null && areCardListItemsEqual(current.cards, cards)) {
          return current;
        }

        return { cards, error: null, isLoading: false };
      });
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);

      if (!options.silent) {
        setState((current) => ({ cards: current.cards, error: appError, isLoading: false }));
      }
    }
  }, [cardRepository, errorReporter, imageStore]);

  useEffect(() => {
    let isMounted = true;

    async function loadCards() {
      try {
        const cards = await toCardListItems(await cardRepository.list(), imageStore);

        if (isMounted) {
          setState({ cards, error: null, isLoading: false });
        }
      } catch (error) {
        const appError = toUnknownAppError(error);
        errorReporter.report(appError);

        if (isMounted) {
          setState({ cards: [], error: appError, isLoading: false });
        }
      }
    }

    void loadCards();

    return () => {
      isMounted = false;
    };
  }, [cardRepository, errorReporter, imageStore]);

  return {
    ...state,
    refresh
  };
}
