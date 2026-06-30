import type { CardRepository, CreateCardInput, UpdateCardInput } from "../../domain/cards/CardRepository";
import type { ExternalSnapshotRepository } from "../../domain/external-surfaces/ExternalSnapshotPorts";

export class ExternalSnapshotAwareCardRepository implements CardRepository {
  constructor(
    private readonly cards: CardRepository,
    private readonly externalSnapshots: ExternalSnapshotRepository
  ) {}

  list() {
    return this.cards.list();
  }

  getById(id: string) {
    return this.cards.getById(id);
  }

  create(input: CreateCardInput) {
    return this.cards.create(input);
  }

  async update(id: string, input: UpdateCardInput) {
    const selected =
      this.externalSnapshots.isAvailable() &&
      (await this.externalSnapshots.isSelected(id));
    if (selected) {
      await this.externalSnapshots.revoke(id);
    }

    const updated = await this.cards.update(id, input);
    if (updated && selected) {
      await this.externalSnapshots.select(updated);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (
      this.externalSnapshots.isAvailable() &&
      (await this.externalSnapshots.isSelected(id))
    ) {
      await this.externalSnapshots.revoke(id);
    }
    await this.cards.delete(id);
  }
}
