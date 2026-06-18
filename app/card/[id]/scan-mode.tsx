import { useLocalSearchParams, useRouter } from "expo-router";

import { CardScanModeScreen } from "@/features/card-detail/screens/CardScanModeScreen";

export default function CardScanModeRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CardScanModeScreen cardId={id} onClose={() => router.back()} />;
}
