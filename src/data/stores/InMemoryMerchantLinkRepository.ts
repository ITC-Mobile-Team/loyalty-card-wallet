import {
  sourceReferenceKey,
  type CardMerchant,
  type ConfirmMerchantLinkInput,
  type MerchantLink,
  type MerchantLinkRepository,
  type MerchantSourceReference,
  type MerchantSuggestionDismissal
} from "../../domain/stores/MerchantLinks";

export class InMemoryMerchantLinkRepository implements MerchantLinkRepository {
  private readonly dismissals: MerchantSuggestionDismissal[] = [];
  private readonly links: MerchantLink[] = [];
  private sequence = 0;

  constructor(
    private readonly merchants: CardMerchant[] = [],
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async ensureCardMerchants(): Promise<void> {}

  async listCardMerchants(): Promise<CardMerchant[]> {
    return structuredClone(this.merchants);
  }

  async listLinks(): Promise<MerchantLink[]> {
    return structuredClone(this.links);
  }

  async listDismissals(): Promise<MerchantSuggestionDismissal[]> {
    return structuredClone(this.dismissals);
  }

  async confirm(input: ConfirmMerchantLinkInput): Promise<MerchantLink> {
    const sourceReference = input.sourceReference;
    const existing = sourceReference
      ? this.links.find(
          (link) =>
            link.sourceReference &&
            sourceReferenceKey(link.sourceReference) === sourceReferenceKey(sourceReference)
        )
      : undefined;
    const timestamp = this.now();

    if (existing) {
      existing.aliases = [...(input.aliases ?? [])];
      existing.displayName = input.displayName;
      existing.enabled = true;
      existing.merchantKey = input.merchantKey;
      existing.sourceReference = sourceReference;
      existing.updatedAt = timestamp;
      if (sourceReference) {
        this.removeDismissal(input.merchantKey, sourceReference);
      }
      return structuredClone(existing);
    }

    const link: MerchantLink = {
      aliases: [...(input.aliases ?? [])],
      createdAt: timestamp,
      displayName: input.displayName,
      enabled: true,
      id: `merchant-link-${++this.sequence}`,
      merchantKey: input.merchantKey,
      sourceReference,
      updatedAt: timestamp
    };
    this.links.push(link);

    if (sourceReference) {
      this.removeDismissal(input.merchantKey, sourceReference);
    }

    return structuredClone(link);
  }

  async correct(
    linkId: string,
    input: Omit<ConfirmMerchantLinkInput, "sourceReference">
  ): Promise<MerchantLink | null> {
    const link = this.links.find((candidate) => candidate.id === linkId);

    if (!link) {
      return null;
    }

    link.aliases = [...(input.aliases ?? [])];
    link.displayName = input.displayName;
    link.enabled = true;
    link.merchantKey = input.merchantKey;
    link.updatedAt = this.now();

    if (link.sourceReference) {
      this.removeDismissal(input.merchantKey, link.sourceReference);
    }

    return structuredClone(link);
  }

  async dismiss(input: { merchantKey: string; sourceReference: MerchantSourceReference }): Promise<void> {
    this.removeDismissal(input.merchantKey, input.sourceReference);
    this.dismissals.push({
      dismissedAt: this.now(),
      merchantKey: input.merchantKey,
      sourceReference: structuredClone(input.sourceReference)
    });
  }

  async setEnabled(linkId: string, enabled: boolean): Promise<MerchantLink | null> {
    const link = this.links.find((candidate) => candidate.id === linkId);

    if (!link) {
      return null;
    }

    link.enabled = enabled;
    link.updatedAt = this.now();
    return structuredClone(link);
  }

  async repairSource(
    linkId: string,
    sourceReference: MerchantSourceReference
  ): Promise<MerchantLink | null> {
    const link = this.links.find((candidate) => candidate.id === linkId);

    if (!link) {
      return null;
    }

    link.sourceReference = structuredClone(sourceReference);
    link.updatedAt = this.now();
    this.removeDismissal(link.merchantKey, sourceReference);
    return structuredClone(link);
  }

  async remove(linkId: string): Promise<void> {
    const index = this.links.findIndex((link) => link.id === linkId);

    if (index >= 0) {
      this.links.splice(index, 1);
    }
  }

  private removeDismissal(merchantKey: string, reference: MerchantSourceReference): void {
    const index = this.dismissals.findIndex(
      (dismissal) =>
        dismissal.merchantKey === merchantKey &&
        sourceReferenceKey(dismissal.sourceReference) === sourceReferenceKey(reference)
    );

    if (index >= 0) {
      this.dismissals.splice(index, 1);
    }
  }
}
