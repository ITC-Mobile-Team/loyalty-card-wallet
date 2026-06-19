import { requireOptionalNativeModule } from "expo";
import { useCallback, useState } from "react";

type CopyFeedback = {
  message: string;
  tone: "error" | "success";
};

type ExpoClipboardModule = typeof import("expo-clipboard");

let clipboardModule: ExpoClipboardModule | null | undefined;

export function useCopyBarcodeValue() {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);

  const copyBarcodeValue = useCallback(async (value: string) => {
    const clipboard = loadClipboardModule();

    if (!clipboard) {
      setCopyFeedback({ message: "Could not copy card number. Select it manually.", tone: "error" });
      return;
    }

    try {
      await clipboard.setStringAsync(value);
      setCopyFeedback({ message: "Card number copied.", tone: "success" });
    } catch {
      setCopyFeedback({ message: "Could not copy card number. Select it manually.", tone: "error" });
    }
  }, []);

  return { copyBarcodeValue, copyFeedback };
}

function loadClipboardModule(): ExpoClipboardModule | null {
  if (clipboardModule !== undefined) {
    return clipboardModule;
  }

  if (!requireOptionalNativeModule("ExpoClipboard")) {
    clipboardModule = null;
    return clipboardModule;
  }

  try {
    // expo-clipboard is a native module; stale native builds should fail the action, not the screen.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clipboardModule = require("expo-clipboard") as ExpoClipboardModule;
  } catch {
    clipboardModule = null;
  }

  return clipboardModule;
}
