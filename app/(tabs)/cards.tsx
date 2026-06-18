import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import { CardsScreen } from "@/features/cards/screens/CardsScreen";

export default function CardsRoute() {
  const router = useRouter();
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
    <CardsScreen
      onAddCard={() => router.push("/add/scan")}
      onOpenCard={(cardId) => router.push(`/card/${cardId}`)}
      refreshSignal={refreshSignal}
    />
  );
}
