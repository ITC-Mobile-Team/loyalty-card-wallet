import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { isAppError, toUnknownAppError, type AppError } from "@/core/errors/AppError";
import type { BarcodeRenderInput, RenderedBarcode } from "@/domain/barcode/BarcodeRenderer";

type RenderedBarcodeState = {
  barcode: RenderedBarcode | null;
  error: AppError | null;
  isLoading: boolean;
};

export function useRenderedBarcode(input: BarcodeRenderInput | null) {
  const { barcodeRenderer, errorReporter } = useDependencies();
  const [state, setState] = useState<RenderedBarcodeState>({
    barcode: null,
    error: null,
    isLoading: Boolean(input)
  });

  const render = useCallback(async () => {
    if (!input) {
      setState({ barcode: null, error: null, isLoading: false });
      return;
    }

    setState((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const barcode = await barcodeRenderer.render(input);
      setState({ barcode, error: null, isLoading: false });
    } catch (error) {
      const appError = isAppError(error) ? error : toUnknownAppError(error);
      errorReporter.report(appError);
      setState({ barcode: null, error: appError, isLoading: false });
    }
  }, [barcodeRenderer, errorReporter, input]);

  useEffect(() => {
    let isMounted = true;

    async function renderWhenMounted() {
      if (!input) {
        if (isMounted) {
          setState({ barcode: null, error: null, isLoading: false });
        }
        return;
      }

      setState((current) => ({ ...current, error: null, isLoading: true }));

      try {
        const barcode = await barcodeRenderer.render(input);

        if (isMounted) {
          setState({ barcode, error: null, isLoading: false });
        }
      } catch (error) {
        const appError = isAppError(error) ? error : toUnknownAppError(error);
        errorReporter.report(appError);

        if (isMounted) {
          setState({ barcode: null, error: appError, isLoading: false });
        }
      }
    }

    void renderWhenMounted();

    return () => {
      isMounted = false;
    };
  }, [barcodeRenderer, errorReporter, input]);

  return {
    ...state,
    retry: render
  };
}
