import { useRouter } from "expo-router";

import { AddScanScreen } from "@/features/add-card/screens/AddScanScreen";

export default function AddScanRoute() {
  const router = useRouter();

  return (
    <AddScanScreen
      onEnterManually={() => router.push("/add/manual")}
      onImportPhoto={() => router.push("/add/photo")}
      onSaved={(cardId) => router.replace(`/card/${cardId}`)}
    />
  );
}
