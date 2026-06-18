import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";

export function AddCatalogScreen() {
  return (
    <Screen>
      <EmptyState
        body="Merchant catalog selection remains optional until local catalog data exists."
        title="Catalog Placeholder"
      />
    </Screen>
  );
}
