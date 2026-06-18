import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { CardDetailScreen } from "@/features/card-detail/screens/CardDetailScreen";

export default function CardDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hasFocused = useRef(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }

      setRefreshSignal((current) => current + 1);
    }, [])
  );

  return (
    <CardDetailScreen
      cardId={id}
      onDeleted={() => router.replace("/(tabs)/cards")}
      onEdit={() => router.push(`/card/${id}/edit`)}
      onScanMode={() => router.push(`/card/${id}/scan-mode`)}
      refreshSignal={refreshSignal}
    />
  );
}
