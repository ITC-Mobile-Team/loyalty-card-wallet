import { useCallback, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { ImageSource, PickedImage } from "@/domain/images/ImageSelection";

type CardImagePickerState = {
  error: AppError | null;
  isPicking: boolean;
  recoveryMessage?: string;
};

function permissionDeniedError(source: ImageSource): AppError {
  if (source === "camera") {
    return {
      kind: "permission",
      permission: "camera",
      message: "Camera access is needed to take a card image."
    };
  }

  return {
    kind: "permission",
    permission: "photos",
    message: "Photo library access is needed to choose a card image."
  };
}

function recoveryMessageFor(error: AppError): string | undefined {
  if (error.kind !== "permission") {
    return undefined;
  }

  return "Allow access in system settings or choose another image source. The current card image was not changed.";
}

export function useCardImagePicker() {
  const { errorReporter, imageSelectionService } = useDependencies();
  const [state, setState] = useState<CardImagePickerState>({
    error: null,
    isPicking: false
  });

  const pickImage = useCallback(
    async (source: ImageSource): Promise<PickedImage | null> => {
      setState({ error: null, isPicking: true });

      try {
        const permission = await imageSelectionService.requestPermission(source);

        if (permission.status !== "granted") {
          const appError = permissionDeniedError(source);
          setState({ error: appError, isPicking: false, recoveryMessage: recoveryMessageFor(appError) });
          return null;
        }

        const result = await imageSelectionService.pickImage(source);

        if (result.status === "canceled") {
          setState({ error: null, isPicking: false });
          return null;
        }

        setState({ error: null, isPicking: false });
        return result.image;
      } catch (error) {
        const appError = isAppError(error) ? error : toUnknownAppError(error);
        errorReporter.report(appError);
        setState({ error: appError, isPicking: false, recoveryMessage: recoveryMessageFor(appError) });
        return null;
      }
    },
    [errorReporter, imageSelectionService]
  );

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null, recoveryMessage: undefined }));
  }, []);

  return {
    ...state,
    clearError,
    pickImage
  };
}
