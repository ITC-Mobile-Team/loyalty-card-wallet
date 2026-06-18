import * as Location from "expo-location";

import { locationPermissionDeniedError, type CurrentLocation, type LocationProvider } from "@/domain/stores/LocationProvider";

export class ExpoLocationProvider implements LocationProvider {
  async getCurrentLocation(): Promise<CurrentLocation> {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      throw locationPermissionDeniedError();
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    return {
      accuracyMeters: position.coords.accuracy ?? undefined,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  }
}
