import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { LoyaltyCard } from "@/domain/cards/Card";
import type { UpdateCardInput } from "@/domain/cards/CardRepository";
import type { PickedImage } from "@/domain/images/ImageSelection";
import type { ImageStore } from "@/domain/images/ImageStore";
import { imagePayloadToDataUri } from "@/features/images/image-data-uri";
import {
  attachPrimaryCardImage,
  deleteCardAndCleanupImages
} from "@/features/images/use-cases/cardImageWorkflow";

export type CardImageSummary = {
  imageCount: number;
  primaryImageUri?: string;
};

type CardDetailsState = {
  card: LoyaltyCard | null;
  error: AppError | null;
  images: CardImageSummary;
  isDeleting: boolean;
  isLoading: boolean;
  isSaving: boolean;
};

function normalizeCardNumber(cardNumber: string, barcodeFormat: LoyaltyCard["barcodeFormat"]): string {
  return barcodeFormat === "qr" ? cardNumber.trim() : cardNumber.replace(/[\s-]+/g, "").trim();
}

function normalizeUpdate(input: UpdateCardInput): UpdateCardInput {
  const barcodeFormat = input.barcodeFormat ?? "code128";
  const normalized: UpdateCardInput = {
    ...input
  };

  if (input.storeName !== undefined) {
    normalized.storeName = input.storeName.trim();
  }

  if (input.cardNumber !== undefined) {
    normalized.cardNumber = normalizeCardNumber(input.cardNumber, barcodeFormat);
  }

  if (input.notes !== undefined) {
    normalized.notes = input.notes.trim();
  }

  return normalized;
}

function validateUpdate(input: UpdateCardInput): void {
  if (input.storeName !== undefined && input.storeName.trim().length === 0) {
    throw {
      kind: "validation",
      field: "storeName",
      message: "Store name is required."
    } satisfies AppError;
  }

  if (input.cardNumber !== undefined && input.cardNumber.trim().length === 0) {
    throw {
      kind: "validation",
      field: "cardNumber",
      message: "Card number is required."
    } satisfies AppError;
  }
}

async function loadImageSummary(card: LoyaltyCard | null, imageStore: ImageStore): Promise<CardImageSummary> {
  if (!card) {
    return { imageCount: 0 };
  }

  const images = await imageStore.listForCard(card.id);
  const imageId = card.thumbnailImageId ?? card.primaryImageId;
  const payload = imageId ? await imageStore.getImage(imageId) : null;

  return {
    imageCount: images.length,
    primaryImageUri: payload ? imagePayloadToDataUri(payload) : undefined
  };
}

function previousPrimaryImageIds(card: LoyaltyCard): string[] {
  return [card.primaryImageId, card.thumbnailImageId].filter(
    (imageId): imageId is string => typeof imageId === "string" && imageId.length > 0
  );
}

export function useCardDetails(cardId: string) {
  const { cardRepository, errorReporter, imageStore, interactionFeedback } = useDependencies();
  const [state, setState] = useState<CardDetailsState>({
    card: null,
    error: null,
    images: { imageCount: 0 },
    isDeleting: false,
    isLoading: true,
    isSaving: false
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const card = await cardRepository.getById(cardId);
      const images = await loadImageSummary(card, imageStore);
      setState((current) => ({ ...current, card, error: null, images, isLoading: false }));
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);
      setState((current) => ({
        ...current,
        error: appError,
        isLoading: false
      }));
    }
  }, [cardId, cardRepository, errorReporter, imageStore]);

  const updateCard = useCallback(
    async (input: UpdateCardInput, primaryImage?: PickedImage): Promise<LoyaltyCard | null> => {
      setState((current) => ({ ...current, error: null, isSaving: true }));

      try {
        validateUpdate(input);
        let updatedCard = await cardRepository.update(cardId, normalizeUpdate(input));

        if (updatedCard && primaryImage) {
          updatedCard = await attachPrimaryCardImage(
            { cardRepository, imageStore },
            cardId,
            primaryImage,
            previousPrimaryImageIds(updatedCard)
          );
        }

        const images = await loadImageSummary(updatedCard, imageStore);
        setState((current) => ({ ...current, card: updatedCard, error: null, images, isSaving: false }));
        interactionFeedback.success();
        return updatedCard;
      } catch (error) {
        const appError = isAppError(error) ? error : toUnknownAppError(error);
        errorReporter.report(appError);
        interactionFeedback.error();
        setState((current) => ({ ...current, error: appError, isSaving: false }));
        return null;
      }
    },
    [cardId, cardRepository, errorReporter, imageStore, interactionFeedback]
  );

  const deleteCard = useCallback(async (): Promise<boolean> => {
    setState((current) => ({ ...current, error: null, isDeleting: true }));

    try {
      await deleteCardAndCleanupImages({ cardRepository, imageStore }, cardId);
      setState((current) => ({
        ...current,
        card: null,
        error: null,
        images: { imageCount: 0 },
        isDeleting: false
      }));
      interactionFeedback.warning();
      return true;
    } catch (error) {
      const appError = toUnknownAppError(error);
      errorReporter.report(appError);
      interactionFeedback.error();
      setState((current) => ({ ...current, error: appError, isDeleting: false }));
      return false;
    }
  }, [cardId, cardRepository, errorReporter, imageStore, interactionFeedback]);

  useEffect(() => {
    let isMounted = true;

    async function loadCard() {
      try {
        const card = await cardRepository.getById(cardId);
        const images = await loadImageSummary(card, imageStore);

        if (isMounted) {
          setState((current) => ({ ...current, card, error: null, images, isLoading: false }));
        }
      } catch (error) {
        const appError = toUnknownAppError(error);
        errorReporter.report(appError);

        if (isMounted) {
          setState((current) => ({
            ...current,
            card: null,
            error: appError,
            images: { imageCount: 0 },
            isLoading: false
          }));
        }
      }
    }

    void loadCard();

    return () => {
      isMounted = false;
    };
  }, [cardId, cardRepository, errorReporter, imageStore]);

  return {
    ...state,
    deleteCard,
    refresh,
    updateCard
  };
}
