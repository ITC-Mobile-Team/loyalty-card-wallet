import type {
  ImagePermissionResult,
  ImageSelectionResult,
  ImageSelectionService
} from "@/domain/images/ImageSelection";

export class UnavailableImageSelectionService implements ImageSelectionService {
  async requestPermission(): Promise<ImagePermissionResult> {
    return { canAskAgain: false, status: "denied" };
  }

  async pickImage(): Promise<ImageSelectionResult> {
    return { status: "canceled" };
  }
}
