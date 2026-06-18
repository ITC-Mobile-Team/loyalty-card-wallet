import { useCallback, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { toUnknownAppError, type AppError } from "@/core/errors/AppError";

import { shareCardLink } from "./shareCardLink";

export type ShareCardLinkState = {
  error: AppError | null;
  isSharing: boolean;
  shareStatusMessage?: string;
};

export function useShareCardLink(cardId: string) {
  const { interactionFeedback, sharingService, textShareService } = useDependencies();
  const [state, setState] = useState<ShareCardLinkState>({
    error: null,
    isSharing: false
  });

  const share = useCallback(async () => {
    setState({ error: null, isSharing: true });

    try {
      const result = await shareCardLink({ cardId, sharingService, textShareService });

      if (result.shared) {
        setState({ error: null, isSharing: false, shareStatusMessage: "Share link sent." });
        interactionFeedback.success();
      } else {
        setState({ error: null, isSharing: false, shareStatusMessage: "Share canceled." });
        interactionFeedback.selectionChanged();
      }

      return result;
    } catch (error) {
      const appError = toUnknownAppError(error);

      setState({
        error: appError,
        isSharing: false,
        shareStatusMessage: undefined
      });
      interactionFeedback.error();
      return null;
    }
  }, [cardId, interactionFeedback, sharingService, textShareService]);

  return {
    ...state,
    share
  };
}
