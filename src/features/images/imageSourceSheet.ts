import { ActionSheetIOS, Alert, Platform } from "react-native";

import type { ImageSource } from "@/domain/images/ImageSelection";

type ShowImageSourceSheetOptions = {
  onSelect: (source: ImageSource) => void;
};

export function showImageSourceSheet({ onSelect }: ShowImageSourceSheetOptions): void {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 2,
        options: ["Camera", "Photo Library", "Cancel"],
        title: "Card Image"
      },
      (buttonIndex) => {
        if (buttonIndex === 0) onSelect("camera");
        if (buttonIndex === 1) onSelect("photoLibrary");
      }
    );
    return;
  }

  Alert.alert("Card Image", "Choose an image source.", [
    { text: "Camera", onPress: () => onSelect("camera") },
    { text: "Photo Library", onPress: () => onSelect("photoLibrary") },
    { text: "Cancel", style: "cancel" }
  ]);
}
