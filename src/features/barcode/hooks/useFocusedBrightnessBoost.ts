import * as Brightness from "expo-brightness";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";

type BrightnessSnapshot = {
  value: number | null;
};

const MAX_SCREEN_BRIGHTNESS = 1;

export function useFocusedBrightnessBoost(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return undefined;
      }

      const snapshot: BrightnessSnapshot = { value: null };
      let isFocused = true;
      let isForeground = true;

      void boostBrightness(snapshot);
      const appStateSubscription = AppState.addEventListener("change", (nextState) => {
        isForeground = nextState === "active";

        if (isForeground) {
          void boostBrightness(snapshot);
          return;
        }

        void restoreBrightness(snapshot);
      });

      return () => {
        isFocused = false;
        appStateSubscription.remove();
        void restoreBrightness(snapshot);
      };

      async function boostBrightness(nextSnapshot: BrightnessSnapshot) {
        try {
          const isAvailable = await Brightness.isAvailableAsync();

          if (!isAvailable || !isFocused || !isForeground) {
            return;
          }

          if (nextSnapshot.value === null) {
            nextSnapshot.value = await Brightness.getBrightnessAsync();
          }

          if (!isFocused || !isForeground) {
            return;
          }

          await Brightness.setBrightnessAsync(MAX_SCREEN_BRIGHTNESS);
        } catch {
          // Brightness is a checkout convenience. A native-module failure must not block the barcode.
        }
      }

      async function restoreBrightness(nextSnapshot: BrightnessSnapshot) {
        try {
          if (nextSnapshot.value === null) {
            return;
          }

          const restoreValue = nextSnapshot.value;

          await Brightness.setBrightnessAsync(restoreValue);
          nextSnapshot.value = null;
        } catch {
          // Keep navigation resilient if the native brightness API is unavailable.
        }
      }
    }, [enabled])
  );
}
