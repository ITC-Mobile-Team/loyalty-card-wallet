import type { AppError } from "@/core/errors/AppError";

export type CurrentLocation = {
  accuracyMeters?: number;
  latitude: number;
  longitude: number;
};

export type LocationProvider = {
  getCurrentLocation(): Promise<CurrentLocation>;
};

export function locationPermissionDeniedError(): AppError {
  return {
    kind: "permission",
    message: "Location access is needed to find nearby stores.",
    permission: "location"
  };
}
