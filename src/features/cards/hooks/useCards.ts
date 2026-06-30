import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { LoyaltyCard } from "@/domain/cards/Card";
import type { CardSort } from "@/domain/cards/CardQueryRepository";
import type { ImageStore } from "@/domain/images/ImageStore";
import { imagePayloadToDataUri } from "@/features/images/image-data-uri";

export type CardListItem = {
  card: LoyaltyCard;
  imageUri?: string;
};

type CardsState = {
  cards: CardListItem[];
  error: AppError | null;
  hasMore: boolean;
  isLoading: boolean;
  total: number;
};

type RefreshOptions = {
  silent?: boolean;
};

export type CardsFilters = {
  archived: boolean;
  favoriteOnly: boolean;
  search: string;
  sort: CardSort;
};

const initialFilters: CardsFilters = {
  archived: false,
  favoriteOnly: false,
  search: "",
  sort: "recent"
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
      leftItem.card.isArchived === rightItem.card.isArchived &&
      leftItem.card.isFavorite === rightItem.card.isFavorite &&
      leftItem.card.lastUsedAt === rightItem.card.lastUsedAt &&
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
  const results = new Array<CardListItem>(cards.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < cards.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await toCardListItem(cards[index], imageStore);
    }
  }

  await Promise.all(Array.from({ length: Math.min(6, cards.length) }, () => worker()));
  return results;
}

export function useCards() {
  const { cardQueryRepository, cardRepository, errorReporter, imageStore } = useDependencies();
  const [filters, setFilters] = useState<CardsFilters>(initialFilters);
  const [state, setState] = useState<CardsState>({
    cards: [],
    error: null,
    hasMore: false,
    isLoading: true,
    total: 0
  });

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    if (!options.silent) {
      setState((current) => ({ ...current, isLoading: true }));
    }

    try {
      const page = await cardQueryRepository.query({ ...filters, limit: 100, offset: 0 });
      const cards = await toCardListItems(page.cards, imageStore);
      setState((current) => {
        if (
          options.silent &&
          current.error === null &&
          current.total === page.total &&
          areCardListItemsEqual(current.cards, cards)
        ) {
          return current;
        }

        return { cards, error: null, hasMore: page.hasMore, isLoading: false, total: page.total };
      });
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);
      setState((current) => ({ ...current, error: appError, isLoading: false }));
    }
  }, [cardQueryRepository, errorReporter, filters, imageStore]);

  useEffect(() => {
    let active = true;

    async function loadCards() {
      try {
        const page = await cardQueryRepository.query({ ...filters, limit: 100, offset: 0 });
        const cards = await toCardListItems(page.cards, imageStore);

        if (active) {
          setState({
            cards,
            error: null,
            hasMore: page.hasMore,
            isLoading: false,
            total: page.total
          });
        }
      } catch (error) {
        const appError = toUnknownAppError(error);
        errorReporter.report(appError);

        if (active) {
          setState((current) => ({ ...current, error: appError, isLoading: false }));
        }
      }
    }

    void loadCards();
    return () => {
      active = false;
    };
  }, [cardQueryRepository, errorReporter, filters, imageStore]);

  const updateCardFlag = useCallback(async (
    card: LoyaltyCard,
    input: { isArchived?: boolean; isFavorite?: boolean; lastUsedAt?: string }
  ) => {
    try {
      await cardRepository.update(card.id, input);
      await refresh({ silent: true });
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);
      setState((current) => ({ ...current, error: appError }));
    }
  }, [cardRepository, errorReporter, refresh]);

  return {
    ...state,
    filters,
    markUsed: (card: LoyaltyCard) => updateCardFlag(card, { lastUsedAt: new Date().toISOString() }),
    refresh,
    setArchived: (archived: boolean) => setFilters((current) => ({ ...current, archived })),
    setFavoriteOnly: (favoriteOnly: boolean) => setFilters((current) => ({ ...current, favoriteOnly })),
    setSearch: (search: string) => setFilters((current) => ({ ...current, search })),
    setSort: (sort: CardSort) => setFilters((current) => ({ ...current, sort })),
    toggleArchive: (card: LoyaltyCard) => updateCardFlag(card, { isArchived: !card.isArchived }),
    toggleFavorite: (card: LoyaltyCard) => updateCardFlag(card, { isFavorite: !card.isFavorite })
  };
}
