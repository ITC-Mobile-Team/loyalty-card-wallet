import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryCardRepository } from "../src/data/cards/InMemoryCardRepository";
import { createCardDuplicateKey } from "../src/domain/cards/CardQueryRepository";

test("card queries filter archive, favorite, search, and sort without losing archived cards", async () => {
  const repository = new InMemoryCardRepository([
    {
      barcodeFormat: "code128",
      cardNumber: "111",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "a",
      isFavorite: true,
      lastUsedAt: "2026-06-20T00:00:00.000Z",
      storeName: "Alpha",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      barcodeFormat: "code128",
      cardNumber: "222",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "b",
      isArchived: true,
      storeName: "Beta",
      updatedAt: "2026-06-21T00:00:00.000Z"
    }
  ]);

  assert.deepEqual((await repository.query({ archived: false, favoriteOnly: true })).cards.map((card) => card.id), ["a"]);
  assert.deepEqual((await repository.query({ archived: true })).cards.map((card) => card.id), ["b"]);
  assert.equal((await repository.query({ archived: false, search: "111" })).total, 1);
});

test("duplicate lookup uses one canonical key", async () => {
  const repository = new InMemoryCardRepository([
    {
      barcodeFormat: "code128",
      cardNumber: "123-456",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "card-1",
      storeName: "Test Market",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]);
  const input = { barcodeFormat: "code128" as const, cardNumber: "123 456", storeName: " test market " };
  const matches = await repository.findDuplicateIds([input]);

  assert.equal(matches.get(createCardDuplicateKey(input)), "card-1");
});

test("1,000-card in-memory query stays within the interaction budget", async () => {
  const repository = new InMemoryCardRepository(
    Array.from({ length: 1_000 }, (_, index) => ({
      barcodeFormat: "code128" as const,
      cardNumber: String(index).padStart(8, "0"),
      createdAt: "2026-01-01T00:00:00.000Z",
      id: `card-${index}`,
      storeName: `Synthetic Store ${index}`,
      updatedAt: "2026-01-01T00:00:00.000Z"
    }))
  );
  const startedAt = performance.now();
  const result = await repository.query({ archived: false, limit: 100, search: "Store 99" });
  const durationMs = performance.now() - startedAt;

  assert.ok(result.total > 0);
  assert.ok(durationMs < 100, `Expected query below 100 ms, received ${durationMs.toFixed(2)} ms.`);
});
