import { useRouter } from "expo-router";

import { AddCatalogScreen } from "@/features/add-card/screens/AddCatalogScreen";

export default function AddCatalogRoute() {
  const router = useRouter();

  return (
    <AddCatalogScreen
      onSelect={(merchant) =>
        router.replace({
          pathname: "/add/manual",
          params: merchant ? { backgroundColor: merchant.defaultBackgroundColor, storeName: merchant.name } : {}
        })
      }
    />
  );
}
