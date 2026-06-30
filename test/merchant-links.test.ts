import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryMerchantLinkRepository } from "../src/data/stores/InMemoryMerchantLinkRepository";
import {
  assessNearbySuggestions,
  createMerchantKey,
  normalizeMerchantName,
  parseStoreSourceReference,
  rankMerchantCandidates,
  sourceReferenceKey,
  type CardMerchant,
  type MerchantSourceReference
} from "../src/domain/stores/MerchantLinks";
import type { StoreSummary } from "../src/domain/stores/StoreRepository";

const timestamp = "2026-06-25T12:00:00.000Z";

test("merchant normalization creates deterministic stable keys", () => {
  assert.equal(normalizeMerchantName("  Сільпо — Shop  "), "сільпо shop");
  assert.equal(createMerchantKey("L'Occitane & Co."), "merchant:loccitane-and-co");
  assert.equal(createMerchantKey("Сільпо"), createMerchantKey("  Сільпо "));
  assert.notEqual(createMerchantKey("Сільпо"), createMerchantKey("Фора"));
});

test("confirmed merchant links support create, read, disable, re-enable, repair, and removal", async () => {
  const merchant = makeMerchant("merchant:silpo", "Сільпо", ["Silpo"]);
  const repository = new InMemoryMerchantLinkRepository([merchant], () => timestamp);
  const originalReference = reference("node", "101", "Сільпо");
  const repairedReference = reference("way", "202", "Silpo");

  const created = await repository.confirm({
    aliases: ["Silpo"],
    displayName: merchant.displayName,
    merchantKey: merchant.merchantKey,
    sourceReference: originalReference
  });

  assert.equal((await repository.listLinks()).length, 1);
  assert.equal(created.merchantKey, merchant.merchantKey);
  assert.deepEqual(created.sourceReference, originalReference);

  assert.equal((await repository.setEnabled(created.id, false))?.enabled, false);
  assert.equal((await repository.setEnabled(created.id, true))?.enabled, true);

  const repaired = await repository.repairSource(created.id, repairedReference);
  assert.equal(repaired?.merchantKey, merchant.merchantKey);
  assert.deepEqual(repaired?.sourceReference, repairedReference);

  await repository.remove(created.id);
  assert.deepEqual(await repository.listLinks(), []);
});

test("dismissal suppresses a candidate until explicit confirmation clears it", async () => {
  const merchant = makeMerchant("merchant:atb", "АТБ", ["ATB"]);
  const repository = new InMemoryMerchantLinkRepository([merchant], () => timestamp);
  const store = makeStore("node/1", "ATB");
  const sourceReference = parseStoreSourceReference(store);
  assert.ok(sourceReference);

  await repository.dismiss({ merchantKey: merchant.merchantKey, sourceReference });
  const dismissed = assessNearbySuggestions({
    dismissals: await repository.listDismissals(),
    links: [],
    merchants: [merchant],
    stores: [store]
  });

  assert.equal(dismissed.suggestions.length, 0);
  assert.equal(dismissed.outcomes[0]?.kind, "dismissedSuggestion");

  await repository.confirm({
    displayName: merchant.displayName,
    merchantKey: merchant.merchantKey,
    sourceReference
  });
  assert.deepEqual(await repository.listDismissals(), []);
});

test("stale OSM evidence produces an explicit repair suggestion without changing merchant identity", () => {
  const merchant = makeMerchant("merchant:novus", "NOVUS", ["Novus"]);
  const staleReference = reference("node", "101", "NOVUS");
  const assessment = assessNearbySuggestions({
    dismissals: [],
    links: [
      {
        aliases: [],
        createdAt: timestamp,
        displayName: merchant.displayName,
        enabled: true,
        id: "link-1",
        merchantKey: merchant.merchantKey,
        sourceReference: staleReference,
        updatedAt: timestamp
      }
    ],
    merchants: [merchant],
    staleSourceReferenceKeys: [sourceReferenceKey(staleReference)],
    stores: [makeStore("way/202", "Novus")]
  });

  assert.equal(assessment.suggestions[0]?.kind, "staleSource");
  assert.deepEqual(assessment.outcomes[0], {
    kind: "staleSource",
    linkId: "link-1",
    storeId: "way/202"
  });
});

test("a confirmed source outside the bounded nearby result is not stale without explicit OSM evidence", () => {
  const merchant = makeMerchant("merchant:novus", "NOVUS", ["Novus"]);
  const existingReference = reference("node", "303", "NOVUS");
  const assessment = assessNearbySuggestions({
    dismissals: [],
    links: [
      {
        aliases: [],
        createdAt: timestamp,
        displayName: merchant.displayName,
        enabled: true,
        id: "link-valid",
        merchantKey: merchant.merchantKey,
        sourceReference: existingReference,
        updatedAt: timestamp
      }
    ],
    merchants: [merchant],
    stores: [makeStore("way/404", "Novus")]
  });

  assert.equal(assessment.suggestions[0]?.kind, "candidate");
  assert.equal(assessment.outcomes.some((outcome) => outcome.kind === "staleSource"), false);
});

test("disabled links and ambiguous matches never become actionable confirmed suggestions", () => {
  const first = makeMerchant("merchant:first", "Alpha", ["Shared"]);
  const second = makeMerchant("merchant:second", "Beta", ["Shared"]);
  const store = makeStore("node/8", "Shared");
  const ambiguous = assessNearbySuggestions({
    dismissals: [],
    links: [],
    merchants: [first, second],
    stores: [store]
  });

  assert.equal(ambiguous.suggestions[0]?.kind, "ambiguous");
  assert.equal(ambiguous.outcomes[0]?.kind, "ambiguousCandidate");

  const disabled = assessNearbySuggestions({
    dismissals: [],
    links: [
      {
        aliases: [],
        createdAt: timestamp,
        displayName: first.displayName,
        enabled: false,
        id: "disabled-link",
        merchantKey: first.merchantKey,
        sourceReference: reference("node", "8", "Shared"),
        updatedAt: timestamp
      }
    ],
    merchants: [first],
    stores: [store]
  });

  assert.equal(disabled.suggestions.length, 0);
  assert.equal(disabled.outcomes[0]?.kind, "disabledSuggestion");
});

test("explicit correction persists the user-selected merchant instead of the proposed candidate", async () => {
  const proposed = makeMerchant("merchant:proposed", "Proposed", ["Shared Store"]);
  const corrected = makeMerchant("merchant:corrected", "Corrected", []);
  const repository = new InMemoryMerchantLinkRepository([proposed, corrected], () => timestamp);
  const store = makeStore("node/42", "Shared Store");
  const sourceReference = parseStoreSourceReference(store);
  assert.ok(sourceReference);

  await repository.confirm({
    displayName: corrected.displayName,
    merchantKey: corrected.merchantKey,
    sourceReference
  });

  const links = await repository.listLinks();
  assert.equal(links.length, 1);
  assert.equal(links[0].merchantKey, corrected.merchantKey);
  assert.notEqual(links[0].merchantKey, proposed.merchantKey);
});

test("an already confirmed link can be corrected while preserving its OSM evidence", async () => {
  const first = makeMerchant("merchant:first", "First", []);
  const corrected = makeMerchant("merchant:corrected", "Corrected", ["Correct alias"]);
  const repository = new InMemoryMerchantLinkRepository([first, corrected], () => timestamp);
  const sourceReference = reference("node", "505", "First");
  const link = await repository.confirm({
    displayName: first.displayName,
    merchantKey: first.merchantKey,
    sourceReference
  });

  const result = await repository.correct(link.id, {
    aliases: corrected.aliases,
    displayName: corrected.displayName,
    merchantKey: corrected.merchantKey
  });

  assert.equal(result?.merchantKey, corrected.merchantKey);
  assert.deepEqual(result?.sourceReference, sourceReference);
  assert.equal(result?.enabled, true);
});

test("conservative labeled matching fixtures exceed 90 percent precision", () => {
  const merchants = [
    makeMerchant("merchant:atb", "АТБ", ["ATB"]),
    makeMerchant("merchant:silpo", "Сільпо", ["Silpo"]),
    makeMerchant("merchant:novus", "NOVUS", ["Novus"]),
    makeMerchant("merchant:rozetka", "ROZETKA", ["Розетка"]),
    makeMerchant("merchant:watsons", "Watsons", ["Ватсонс"]),
    makeMerchant("merchant:eva", "EVA", ["Єва"]),
    makeMerchant("merchant:metro", "METRO", ["Metro Cash & Carry"]),
    makeMerchant("merchant:auchan", "Auchan", ["Ашан"]),
    makeMerchant("merchant:varus", "VARUS", ["Varus"]),
    makeMerchant("merchant:fora", "Фора", ["Fora"])
  ];
  const fixtures = [
    ["ATB", "merchant:atb"],
    ["Сільпо supermarket", "merchant:silpo"],
    ["Novus", "merchant:novus"],
    ["Розетка", "merchant:rozetka"],
    ["Watsons Shop", "merchant:watsons"],
    ["Єва", "merchant:eva"],
    ["Metro Cash & Carry", "merchant:metro"],
    ["Ашан", "merchant:auchan"],
    ["VARUS market", "merchant:varus"],
    ["Fora Store", "merchant:fora"],
    ["Independent Bakery", null],
    ["Central Market", null]
  ] as const;
  let accepted = 0;
  let correct = 0;

  fixtures.forEach(([name, expectedMerchantKey], index) => {
    const ranked = rankMerchantCandidates(makeStore(`node/${index}`, name), merchants);

    if (ranked.length > 0) {
      accepted += 1;
      if (ranked[0].merchant.merchantKey === expectedMerchantKey) {
        correct += 1;
      }
    }
  });

  const precision = accepted === 0 ? 1 : correct / accepted;
  assert.ok(precision >= 0.9, `expected >= 90% precision, received ${precision * 100}%`);
  assert.equal(accepted, 10);
});

function makeMerchant(merchantKey: string, displayName: string, aliases: string[]): CardMerchant {
  return {
    aliases,
    cards: [{ cardId: `${merchantKey}-card`, cardNumberSuffix: "1234", storeName: displayName }],
    displayName,
    merchantKey,
    normalizedName: normalizeMerchantName(displayName)
  };
}

function makeStore(id: string, name: string): StoreSummary {
  return {
    id,
    name,
    source: "openstreetmap"
  };
}

function reference(
  type: MerchantSourceReference["type"],
  id: string,
  observedName: string
): MerchantSourceReference {
  return { id, observedName, source: "openstreetmap", type };
}
