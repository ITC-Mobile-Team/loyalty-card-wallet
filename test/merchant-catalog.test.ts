import assert from "node:assert/strict";
import test from "node:test";

import { BundledMerchantCatalogRepository } from "../src/data/catalog/BundledMerchantCatalogRepository";

test("Ukraine catalog searches Ukrainian, Russian, and English aliases", async () => {
  const catalog = new BundledMerchantCatalogRepository();

  assert.equal((await catalog.search("Сільпо"))[0]?.id, "silpo");
  assert.equal((await catalog.search("Сильпо"))[0]?.id, "silpo");
  assert.equal((await catalog.search("Silpo"))[0]?.id, "silpo");
  assert.equal((await catalog.search("Эпицентр"))[0]?.id, "epicentr");
  assert.equal(catalog.version(), 1);
});

test("empty catalog search returns bounded generic entries without artwork URLs", async () => {
  const results = await new BundledMerchantCatalogRepository().search("", 5);

  assert.equal(results.length, 5);
  assert.ok(results.every((entry) => !("logoUri" in entry)));
});

test("catalog user aliases are searchable without replacing bundled aliases", async () => {
  const catalog = new BundledMerchantCatalogRepository();
  await catalog.saveOverride({ aliases: ["Мій супермаркет"], merchantId: "silpo" });

  assert.equal((await catalog.search("Мій супермаркет"))[0]?.id, "silpo");
  assert.equal((await catalog.search("Silpo"))[0]?.id, "silpo");
});
