import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { Platform, StyleSheet, View } from "react-native";

import { colors, radius } from "@/design/tokens";

import { MapPreviewErrorBoundary } from "./MapPreviewErrorBoundary";
import { MapPreviewFallback } from "./MapPreviewFallback";

type ExpoMapsModule = typeof import("expo-maps");

type StoreMapPreviewProps = {
  latitude: number;
  longitude: number;
  title: string;
};

let expoMapsModule: ExpoMapsModule | null | undefined;

export function StoreMapPreview({ latitude, longitude, title }: StoreMapPreviewProps) {
  const expoMaps = loadExpoMapsModule();

  if (Platform.OS === "android" && !isAndroidMapsConfigured()) {
    return <MapPreviewFallback />;
  }

  if (!expoMaps) {
    return <MapPreviewFallback />;
  }

  const resetKey = `${Platform.OS}:${latitude}:${longitude}:${title}`;

  return (
    <MapPreviewErrorBoundary resetKey={resetKey}>
      <NativeStoreMapPreview expoMaps={expoMaps} latitude={latitude} longitude={longitude} title={title} />
    </MapPreviewErrorBoundary>
  );
}

function NativeStoreMapPreview({
  expoMaps,
  latitude,
  longitude,
  title
}: StoreMapPreviewProps & { expoMaps: ExpoMapsModule }) {
  const cameraPosition = {
    coordinates: { latitude, longitude },
    zoom: 16
  };
  const markers = [
    {
      coordinates: { latitude, longitude },
      id: "store",
      title
    }
  ];

  if (Platform.OS === "ios") {
    const AppleMapView = expoMaps.AppleMaps?.View;

    if (!AppleMapView) {
      return <MapPreviewFallback />;
    }

    return (
      <View style={styles.container}>
        <AppleMapView
          cameraPosition={cameraPosition}
          colorScheme={mapValue(expoMaps.AppleMaps?.MapColorScheme?.DARK, "DARK")}
          markers={markers}
          properties={{
            isMyLocationEnabled: false,
            mapType: mapValue(expoMaps.AppleMaps?.MapType?.STANDARD, "STANDARD"),
            selectionEnabled: false
          }}
          style={styles.map}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
            scaleBarEnabled: false,
            togglePitchEnabled: false
          }}
        />
      </View>
    );
  }

  if (Platform.OS === "android") {
    const GoogleMapView = expoMaps.GoogleMaps?.View;

    if (!GoogleMapView) {
      return <MapPreviewFallback />;
    }

    return (
      <View style={styles.container}>
        <GoogleMapView
          cameraPosition={cameraPosition}
          colorScheme={mapValue(expoMaps.GoogleMaps?.MapColorScheme?.DARK, "DARK")}
          markers={markers}
          properties={{
            isBuildingEnabled: true,
            isIndoorEnabled: false,
            isMyLocationEnabled: false,
            isTrafficEnabled: false,
            mapType: mapValue(expoMaps.GoogleMaps?.MapType?.NORMAL, "NORMAL"),
            selectionEnabled: false
          }}
          style={styles.map}
          uiSettings={{
            compassEnabled: false,
            mapToolbarEnabled: false,
            myLocationButtonEnabled: false,
            rotationGesturesEnabled: false,
            scrollGesturesEnabled: false,
            tiltGesturesEnabled: false,
            zoomControlsEnabled: false,
            zoomGesturesEnabled: false
          }}
        />
      </View>
    );
  }

  return <MapPreviewFallback />;
}

function loadExpoMapsModule(): ExpoMapsModule | null {
  if (expoMapsModule !== undefined) {
    return expoMapsModule;
  }

  if (!requireOptionalNativeModule("ExpoMaps")) {
    expoMapsModule = null;
    return expoMapsModule;
  }

  try {
    // expo-maps is unavailable in Expo Go and stale native builds. Keep Store detail recoverable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expoMapsModule = require("expo-maps") as ExpoMapsModule;
  } catch {
    expoMapsModule = null;
  }

  return expoMapsModule;
}

function isAndroidMapsConfigured(): boolean {
  return Constants.expoConfig?.extra?.androidMapsConfigured === true;
}

function mapValue<T>(value: T | undefined, fallback: string): T {
  return (value ?? fallback) as T;
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    overflow: "hidden",
    backgroundColor: colors.surface.field,
    borderRadius: radius.field
  },
  map: {
    flex: 1,
    minHeight: 180
  }
});
