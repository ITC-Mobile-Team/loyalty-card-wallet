import { MapPreviewFallback } from "./MapPreviewFallback";

type StoreMapPreviewProps = {
  latitude: number;
  longitude: number;
  title: string;
};

export function StoreMapPreview(_props: StoreMapPreviewProps) {
  return <MapPreviewFallback />;
}
