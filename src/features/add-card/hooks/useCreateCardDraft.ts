import { useCallback, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { BarcodeFormat, LoyaltyCard } from "@/domain/cards/Card";
import type { PickedImage } from "@/domain/images/ImageSelection";
import { attachPrimaryCardImage } from "@/features/images/use-cases/cardImageWorkflow";

export type CreateCardDraft = {
  barcodeFormat: BarcodeFormat;
  cardNumber: string;
  notes?: string;
  storeName: string;
};

type CreateCardState = {
  error: AppError | null;
  isSaving: boolean;
};

function normalizeCardNumber(cardNumber: string, barcodeFormat: BarcodeFormat): string {
  return barcodeFormat === "qr" ? cardNumber.trim() : cardNumber.replace(/[\s-]+/g, "").trim();
}

function validateDraft(draft: CreateCardDraft): CreateCardDraft {
  const storeName = draft.storeName.trim();
  const cardNumber = normalizeCardNumber(draft.cardNumber, draft.barcodeFormat);

  if (storeName.length === 0) {
    throw {
      kind: "validation",
      field: "storeName",
      message: "Store name is required."
    } satisfies AppError;
  }

  if (cardNumber.length === 0) {
    throw {
      kind: "validation",
      field: "cardNumber",
      message: "Card number is required."
    } satisfies AppError;
  }

  return {
    barcodeFormat: draft.barcodeFormat,
    cardNumber,
    notes: draft.notes?.trim(),
    storeName
  };
}

export function useCreateCardDraft() {
  const { cardRepository, errorReporter, imageStore, interactionFeedback } = useDependencies();
  const [state, setState] = useState<CreateCardState>({
    error: null,
    isSaving: false
  });

  const createCard = useCallback(
    async (draft: CreateCardDraft, primaryImage?: PickedImage): Promise<LoyaltyCard | null> => {
      setState({ error: null, isSaving: true });

      try {
        const input = validateDraft(draft);
        let card = await cardRepository.create(input);

        if (primaryImage) {
          const cardWithImage = await attachPrimaryCardImage(
            { cardRepository, imageStore },
            card.id,
            primaryImage
          );
          card = cardWithImage ?? card;
        }

        setState({ error: null, isSaving: false });
        interactionFeedback.success();
        return card;
      } catch (error) {
        const appError = isAppError(error) ? error : toUnknownAppError(error);
        errorReporter.report(appError);
        interactionFeedback.error();
        setState({ error: appError, isSaving: false });
        return null;
      }
    },
    [cardRepository, errorReporter, imageStore, interactionFeedback]
  );

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  return {
    ...state,
    clearError,
    createCard
  };
}
