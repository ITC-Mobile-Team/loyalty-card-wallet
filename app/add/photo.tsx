import { useRouter } from "expo-router";

import { AddPhotoScreen } from "@/features/add-card/screens/AddPhotoScreen";

export default function AddPhotoRoute() {
  const router = useRouter();

  return <AddPhotoScreen onSaved={(cardId) => router.replace(`/card/${cardId}`)} />;
}
