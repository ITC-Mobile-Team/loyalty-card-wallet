import { useRouter } from "expo-router";

import { AddManualScreen } from "@/features/add-card/screens/AddManualScreen";

export default function AddManualRoute() {
  const router = useRouter();

  return <AddManualScreen onSaved={(cardId) => router.replace(`/card/${cardId}`)} />;
}
