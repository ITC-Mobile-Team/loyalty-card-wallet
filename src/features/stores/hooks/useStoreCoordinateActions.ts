import { requireOptionalNativeModule } from "expo";
import { useMemo, useState } from "react";
import { Linking, Platform } from "react-native";

import type { StoreCoordinate } from "@/features/stores/storeCoordinates";
import { createStoreCoordinateActions } from "@/features/stores/storeCoordinateActions";

type CoordinateActionFeedback = {
  message: string;
  tone: "error" | "success";
};

type UseStoreCoordinateActionsProps = {
  coordinate: StoreCoordinate;
  storeName: string;
};

type ExpoClipboardModule = typeof import("expo-clipboard");

let clipboardModule: ExpoClipboardModule | null | undefined;

export function useStoreCoordinateActions({ coordinate, storeName }: UseStoreCoordinateActionsProps) {
  const [feedback, setFeedback] = useState<CoordinateActionFeedback | null>(null);

  const actions = useMemo(
    () =>
      createStoreCoordinateActions({
        coordinate,
        dependencies: {
          copyText: setClipboardStringAsync,
          openUrl: Linking.openURL
        },
        platform: Platform.OS,
        storeName
      }),
    [coordinate, storeName]
  );

  return {
    copyCoordinates: async () => {
      const result = await actions.copyCoordinates();

      setFeedback(
        result.ok
          ? { message: result.message ?? "Coordinates copied.", tone: "success" }
          : { message: result.message, tone: "error" }
      );
    },
    feedback,
    openInMaps: async () => {
      const result = await actions.openInMaps();

      if (result.ok) {
        setFeedback(null);
        return;
      }

      setFeedback({ message: result.message, tone: "error" });
    }
  };
}

async function setClipboardStringAsync(text: string): Promise<void> {
  const clipboard = loadClipboardModule();

  if (!clipboard) {
    throw new Error("Expo Clipboard native module is unavailable.");
  }

  await clipboard.setStringAsync(text);
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
