import { useLocalSearchParams, useRouter } from "expo-router";

import { ReceivedCardShareScreen } from "@/features/sharing/screens/ReceivedCardShareScreen";

export default function SharedCardRoute() {
  const router = useRouter();
  const { payload } = useLocalSearchParams<{ payload?: string | string[] }>();
  const encodedPayload = Array.isArray(payload) ? payload[0] : payload;

  return (
    <ReceivedCardShareScreen
      encodedPayload={encodedPayload}
      onClose={() => router.replace("/(tabs)/cards")}
      onSaved={(cardId) => router.replace(`/card/${cardId}`)}
    />
  );
}
