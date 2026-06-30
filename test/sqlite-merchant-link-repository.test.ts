import assert from "node:assert/strict";
import test from "node:test";

import { SQLiteCardRepository } from "../src/data/cards/SQLiteCardRepository";
import { migrateDatabase } from "../src/data/storage/migrateDatabase";
import { SQLiteMerchantLinkRepository } from "../src/data/stores/SQLiteMerchantLinkRepository";
import { createNodeSqliteTestDatabase } from "./support/NodeSqliteDatabase";

const timestamp = "2026-06-25T12:00:00.000Z";

test("SQLite merchant-link repository persists create, correction, disable, repair, dismissal, and removal", async () => {
  const database = createNodeSqliteTestDatabase();

  try {
    await migrateDatabase(database, () => timestamp);
    const cardRepository = new SQLiteCardRepository(async () => database);
    const repository = new SQLiteMerchantLinkRepository(async () => database, () => timestamp);
    const silpoCard = await cardRepository.create({
      barcodeFormat: "code128",
      cardNumber: "11112222",
      storeName: "Сільпо"
    });
    await cardRepository.create({
      barcodeFormat: "code128",
      cardNumber: "33334444",
      storeName: "Фора"
    });

    const merchants = await repository.listCardMerchants();
    const silpo = merchants.find((merchant) => merchant.displayName === "Сільпо");
    const fora = merchants.find((merchant) => merchant.displayName === "Фора");
    assert.ok(silpo);
    assert.ok(fora);
    assert.equal(silpo.cards[0].cardId, silpoCard.id);

    const created = await repository.confirm({
      aliases: ["Silpo"],
      displayName: silpo.displayName,
      merchantKey: silpo.merchantKey,
      sourceReference: {
        id: "101",
        observedName: "Silpo",
        source: "openstreetmap",
        type: "node"
      }
    });
    assert.equal((await repository.listLinks())[0].merchantKey, silpo.merchantKey);

    const corrected = await repository.correct(created.id, {
      aliases: ["Fora"],
      displayName: fora.displayName,
      merchantKey: fora.merchantKey
    });
    assert.equal(corrected?.merchantKey, fora.merchantKey);
    assert.equal(corrected?.sourceReference?.id, "101");

    assert.equal((await repository.setEnabled(created.id, false))?.enabled, false);
    assert.equal((await repository.setEnabled(created.id, true))?.enabled, true);

    const repaired = await repository.repairSource(created.id, {
      id: "202",
      observedName: "Фора",
      source: "openstreetmap",
      type: "way"
    });
    assert.equal(repaired?.merchantKey, fora.merchantKey);
    assert.deepEqual(repaired?.sourceReference, {
      id: "202",
      observedName: "Фора",
      source: "openstreetmap",
      type: "way"
    });

    await repository.dismiss({
      merchantKey: fora.merchantKey,
      sourceReference: repaired!.sourceReference!
    });
    assert.equal((await repository.listDismissals()).length, 1);

    await repository.confirm({
      displayName: fora.displayName,
      merchantKey: fora.merchantKey,
      sourceReference: repaired!.sourceReference
    });
    assert.equal((await repository.listDismissals()).length, 0);

    await repository.remove(created.id);
    assert.deepEqual(await repository.listLinks(), []);
  } finally {
    database.close();
  }
});

test("card rename preserves the stable merchant key in SQLite", async () => {
  const database = createNodeSqliteTestDatabase();

  try {
    await migrateDatabase(database, () => timestamp);
    const cardRepository = new SQLiteCardRepository(async () => database);
    const merchantRepository = new SQLiteMerchantLinkRepository(async () => database, () => timestamp);
    const card = await cardRepository.create({
      barcodeFormat: "code128",
      cardNumber: "55556666",
      storeName: "Original Merchant"
    });
    const before = (await merchantRepository.listCardMerchants())[0];

    await cardRepository.update(card.id, { storeName: "Corrected Display Name" });
    const after = (await merchantRepository.listCardMerchants())[0];

    assert.equal(after.merchantKey, before.merchantKey);
    assert.equal(after.displayName, "Corrected Display Name");
  } finally {
    database.close();
  }
});

test("confirming the same OSM reference corrects the existing link instead of duplicating it", async () => {
  const database = createNodeSqliteTestDatabase();

  try {
    await migrateDatabase(database, () => timestamp);
    const repository = new SQLiteMerchantLinkRepository(async () => database, () => timestamp);
    const sourceReference = {
      id: "999",
      observedName: "Shared Store",
      source: "openstreetmap" as const,
      type: "node" as const
    };

    const first = await repository.confirm({
      displayName: "First",
      merchantKey: "merchant:first",
      sourceReference
    });
    const second = await repository.confirm({
      displayName: "Second",
      merchantKey: "merchant:second",
      sourceReference
    });

    assert.equal(second.id, first.id);
    assert.equal(second.merchantKey, "merchant:second");
    assert.equal((await repository.listLinks()).length, 1);
  } finally {
    database.close();
  }
});
