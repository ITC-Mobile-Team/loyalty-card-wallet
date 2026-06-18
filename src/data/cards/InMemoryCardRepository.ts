import type { LoyaltyCard } from "../../domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../../domain/cards/CardRepository";
import { createLocalId } from "../storage/id";

export class InMemoryCardRepository implements CardRepository {
  private readonly cards: LoyaltyCard[];

  constructor(cards: LoyaltyCard[] = []) {
    this.cards = [...cards];
  }

  async list(): Promise<LoyaltyCard[]> {
    return [...this.cards];
  }

  async getById(id: string): Promise<LoyaltyCard | null> {
    return this.cards.find((card) => card.id === id) ?? null;
  }

  async create(input: CreateCardInput): Promise<LoyaltyCard> {
    const now = new Date().toISOString();
    const card: LoyaltyCard = {
      id: createLocalId("card"),
      createdAt: now,
      updatedAt: now,
      ...input
    };

    this.cards.push(card);
    return card;
  }

  async update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null> {
    const index = this.cards.findIndex((card) => card.id === id);

    if (index === -1) {
      return null;
    }

    const updatedCard: LoyaltyCard = {
      ...this.cards[index],
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.cards[index] = updatedCard;
    return updatedCard;
  }

  async delete(id: string): Promise<void> {
    const index = this.cards.findIndex((card) => card.id === id);

    if (index !== -1) {
      this.cards.splice(index, 1);
    }
  }
}
