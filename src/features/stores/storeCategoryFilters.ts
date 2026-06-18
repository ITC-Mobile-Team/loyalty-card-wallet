import type { StoreSummary } from "@/domain/stores/StoreRepository";

export type StoreCategoryFilter = {
  count: number;
  label: string;
  value: string | null;
};

export function buildStoreCategoryFilters(stores: readonly Pick<StoreSummary, "category">[]): StoreCategoryFilter[] {
  const categoryCounts = new Map<string, number>();

  stores.forEach((store) => {
    const category = store.category?.trim();

    if (!category) {
      return;
    }

    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  });

  const categoryFilters = [...categoryCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => ({
      count,
      label: category,
      value: category
    }));

  return [
    {
      count: stores.length,
      label: "All",
      value: null
    },
    ...categoryFilters
  ];
}

export function filterStoresByCategory<TStore extends Pick<StoreSummary, "category">>(
  stores: readonly TStore[],
  category: string | null
): TStore[] {
  if (!category) {
    return [...stores];
  }

  return stores.filter((store) => store.category === category);
}
