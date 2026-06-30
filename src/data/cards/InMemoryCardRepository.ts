import type { LoyaltyCard } from "../../domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../../domain/cards/CardRepository";
import {
  createCardDuplicateKey,
  type CardDuplicateKey,
  type CardQuery,
  type CardQueryPage,
  type CardQueryRepository
} from "../../domain/cards/CardQueryRepository";
import { createLocalId } from "../storage/id";

export class InMemoryCardRepository implements CardRepository, CardQueryRepository {
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
      ...input,
      isArchived: input.isArchived ?? false,
      isFavorite: input.isFavorite ?? false
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

  async query(query: CardQuery): Promise<CardQueryPage> {
    const search = query.search?.trim().toLocaleLowerCase() ?? "";
    const filtered = this.cards
      .filter((card) => Boolean(card.isArchived) === Boolean(query.archived))
      .filter((card) => !query.favoriteOnly || card.isFavorite)
      .filter(
        (card) =>
          !search ||
          card.storeName.toLocaleLowerCase().includes(search) ||
          card.cardNumber.replace(/[\s-]+/g, "").includes(search.replace(/[\s-]+/g, ""))
      )
      .sort((left, right) => {
        if (Boolean(left.isFavorite) !== Boolean(right.isFavorite)) {
          return left.isFavorite ? -1 : 1;
        }

        if (query.sort === "recent") {
          return (right.lastUsedAt ?? right.updatedAt).localeCompare(left.lastUsedAt ?? left.updatedAt);
        }

        return left.storeName.localeCompare(right.storeName);
      });
    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.max(1, query.limit ?? 100);

    return {
      cards: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
      total: filtered.length
    };
  }

  async findDuplicateIds(keys: readonly CardDuplicateKey[]): Promise<Map<string, string>> {
    const requested = new Set(keys.map(createCardDuplicateKey));
    const result = new Map<string, string>();

    for (const card of this.cards) {
      const key = createCardDuplicateKey(card);
      if (requested.has(key)) {
        result.set(key, card.id);
      }
    }

    return result;
  }
}
