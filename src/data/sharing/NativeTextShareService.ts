import { Share } from "react-native";

import type { ShareTextInput, TextShareService } from "@/domain/sharing/TextShareService";

export class NativeTextShareService implements TextShareService {
  async shareText(input: ShareTextInput): Promise<boolean> {
    const result = await Share.share({
      message: input.message,
      title: input.title
    });

    return result.action === Share.sharedAction;
  }
}
