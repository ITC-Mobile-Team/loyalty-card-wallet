import { useRouter } from "expo-router";

import { BulkImportScreen } from "@/features/importing/screens/BulkImportScreen";

export default function BulkImportRoute() {
  const router = useRouter();

  return <BulkImportScreen onCompleted={() => router.replace("/(tabs)/cards")} />;
}
