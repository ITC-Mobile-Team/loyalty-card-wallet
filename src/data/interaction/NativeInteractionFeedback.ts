import { Platform, Vibration } from "react-native";

import type { InteractionFeedback } from "@/core/interaction/InteractionFeedback";

function vibrate(pattern: number | number[]): void {
  Vibration.vibrate(pattern);
}

export class NativeInteractionFeedback implements InteractionFeedback {
  selectionChanged(): void {
    vibrate(Platform.OS === "android" ? 8 : 10);
  }

  success(): void {
    vibrate(Platform.OS === "android" ? [0, 18, 36, 18] : 20);
  }

  warning(): void {
    vibrate(Platform.OS === "android" ? [0, 28, 42, 28] : 30);
  }

  error(): void {
    vibrate(Platform.OS === "android" ? [0, 35, 40, 35, 40, 35] : 50);
  }
}
