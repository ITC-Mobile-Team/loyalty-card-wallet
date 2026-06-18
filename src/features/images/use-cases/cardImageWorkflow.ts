import type { LoyaltyCard } from "@/domain/cards/Card";
import type { CardRepository } from "@/domain/cards/CardRepository";
import type { PickedImage } from "@/domain/images/ImageSelection";
import type { ImageRole, ImageStore, StoredImage } from "@/domain/images/ImageStore";

export type CardImageWorkflowDependencies = {
  cardRepository: CardRepository;
  imageStore: ImageStore;
};

export type PersistCardImageInput = {
  cardId: string;
  image: PickedImage;
  role: ImageRole;
};

export async function persistCardImage(
  dependencies: Pick<CardImageWorkflowDependencies, "imageStore">,
  input: PersistCardImageInput
): Promise<StoredImage> {
  return dependencies.imageStore.saveImage({
    cardId: input.cardId,
    data: input.image.data,
    height: input.image.height,
    mimeType: input.image.mimeType,
    role: input.role,
    width: input.image.width
  });
}

export async function attachAdditionalCardImage(
  dependencies: Pick<CardImageWorkflowDependencies, "imageStore">,
  cardId: string,
  image: PickedImage
): Promise<StoredImage> {
  return persistCardImage(dependencies, { cardId, image, role: "additional" });
}

export async function attachPrimaryCardImage(
  dependencies: CardImageWorkflowDependencies,
  cardId: string,
  image: PickedImage,
  previousImageIds: readonly string[] = []
): Promise<LoyaltyCard | null> {
  const savedImage = await persistCardImage(dependencies, { cardId, image, role: "primary" });

  try {
    const updatedCard = await dependencies.cardRepository.update(cardId, {
      primaryImageId: savedImage.id,
      thumbnailImageId: savedImage.id
    });

    if (!updatedCard) {
      await dependencies.imageStore.deleteImage(savedImage.id);
      return null;
    }

    await cleanupReplacedImages(dependencies.imageStore, previousImageIds, [savedImage.id]);
    return updatedCard;
  } catch (error) {
    await dependencies.imageStore.deleteImage(savedImage.id);
    throw error;
  }
}

export async function deleteCardAndCleanupImages(
  dependencies: CardImageWorkflowDependencies,
  cardId: string
): Promise<void> {
  await dependencies.cardRepository.delete(cardId);
  await dependencies.imageStore.deleteUnreferencedPayloads();
}

async function cleanupReplacedImages(
  imageStore: ImageStore,
  candidateIds: readonly string[],
  keepIds: readonly string[]
): Promise<void> {
  const uniqueCandidateIds = [...new Set(candidateIds.filter(Boolean))];
  const keepIdSet = new Set(keepIds);

  await Promise.all(
    uniqueCandidateIds
      .filter((imageId) => !keepIdSet.has(imageId))
      .map((imageId) => imageStore.deleteImage(imageId))
  );
  await imageStore.deleteUnreferencedPayloads();
}
