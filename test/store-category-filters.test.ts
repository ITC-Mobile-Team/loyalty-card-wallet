import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoreCategoryFilters,
  filterStoresByCategory
} from "../src/features/stores/storeCategoryFilters";

const stores = [
  { category: "Convenience", id: "node/1", name: "A" },
  { category: "Alcohol", id: "node/2", name: "B" },
  { category: "Convenience", id: "node/3", name: "C" },
  { category: undefined, id: "node/4", name: "D" }
];

test("buildStoreCategoryFilters creates All plus sorted category chips with counts", () => {
  assert.deepEqual(buildStoreCategoryFilters(stores), [
    { count: 4, label: "All", value: null },
    { count: 1, label: "Alcohol", value: "Alcohol" },
    { count: 2, label: "Convenience", value: "Convenience" }
  ]);
});

test("filterStoresByCategory returns all stores when no category is selected", () => {
  assert.deepEqual(filterStoresByCategory(stores, null), stores);
});

test("filterStoresByCategory returns stores matching the selected category", () => {
  assert.deepEqual(filterStoresByCategory(stores, "Convenience"), [
    { category: "Convenience", id: "node/1", name: "A" },
    { category: "Convenience", id: "node/3", name: "C" }
  ]);
});
