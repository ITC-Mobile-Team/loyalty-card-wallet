import { useLocalSearchParams } from "expo-router";

import { StoreDetailScreen } from "@/features/stores/screens/StoreDetailScreen";

export default function StoreDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <StoreDetailScreen storeId={decodeStoreId(id)} />;
}

function decodeStoreId(id: string | undefined) {
  if (!id) {
    return "";
  }

  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
