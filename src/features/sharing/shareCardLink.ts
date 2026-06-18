import type { SharingService } from "../../domain/sharing/SharingPorts";
import type { TextShareService } from "../../domain/sharing/TextShareService";
import {
  createCardShareLinkPayload,
  encodeCardSharePayload
} from "../../domain/sharing/cardShareLink";

export type ShareCardLinkInput = {
  cardId: string;
  now?: () => Date;
  sharingService: SharingService;
  textShareService: TextShareService;
};

export type ShareCardLinkResult = {
  shared: boolean;
  url: string;
};

export function createCardShareDeepLink(encodedPayload: string): string {
  return `loyaltycardwallet://share/card?payload=${encodeURIComponent(encodedPayload)}`;
}

export async function shareCardLink({
  cardId,
  now = () => new Date(),
  sharingService,
  textShareService
}: ShareCardLinkInput): Promise<ShareCardLinkResult> {
  const bundle = await sharingService.exportCards({ cardIds: [cardId], includeImages: false });
  const payload = createCardShareLinkPayload(bundle, now().toISOString());
  const encodedPayload = encodeCardSharePayload(payload);
  const url = createCardShareDeepLink(encodedPayload);
  const card = payload.bundle.cards[0];
  const shared = await textShareService.shareText({
    title: `Share ${card.storeName}`,
    message: `I shared a loyalty card with you.\n\nOpen it in Loyalty Card Wallet:\n${url}`
  });

  return { shared, url };
}
