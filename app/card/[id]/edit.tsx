import { useLocalSearchParams, useRouter } from "expo-router";

import { CardEditScreen } from "@/features/card-detail/screens/CardEditScreen";

export default function CardEditRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CardEditScreen cardId={id} onCancel={() => router.back()} onSaved={() => router.back()} />;
}
