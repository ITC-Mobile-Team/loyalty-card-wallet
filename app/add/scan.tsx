import { useRouter } from "expo-router";

import { AddScanScreen } from "@/features/add-card/screens/AddScanScreen";

export default function AddScanRoute() {
  const router = useRouter();

  return (
    <AddScanScreen
      onEnterManually={() => router.push("/add/manual")}
      onImportBulk={() => router.push("/add/bulk" as never)}
      onImportPhoto={() => router.push("/add/photo")}
      onOpenCatalog={() => router.push("/add/catalog")}
      onSaved={(cardId) => router.replace(`/card/${cardId}`)}
    />
  );
}
