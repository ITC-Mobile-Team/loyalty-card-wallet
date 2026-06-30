import { useLocalSearchParams, useRouter } from "expo-router";

import { AddManualScreen } from "@/features/add-card/screens/AddManualScreen";

export default function AddManualRoute() {
  const router = useRouter();
  const { backgroundColor, storeName } = useLocalSearchParams<{
    backgroundColor?: string;
    storeName?: string;
  }>();

  return (
    <AddManualScreen
      initialBackgroundColor={backgroundColor}
      initialStoreName={storeName}
      onSaved={(cardId) => router.replace(`/card/${cardId}`)}
    />
  );
}
