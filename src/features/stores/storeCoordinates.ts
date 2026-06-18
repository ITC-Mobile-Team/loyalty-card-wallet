import type { StoreSummary } from "@/domain/stores/StoreRepository";

export type StoreCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapsPlatform = "android" | "ios" | "web" | string;

const COORDINATE_PRECISION = 5;

export function getValidStoreCoordinate(store: Pick<StoreSummary, "latitude" | "longitude">): StoreCoordinate | null {
  if (!isValidLatitude(store.latitude) || !isValidLongitude(store.longitude)) {
    return null;
  }

  return {
    latitude: store.latitude,
    longitude: store.longitude
  };
}

export function formatCoordinates(coordinate: StoreCoordinate): string {
  return `${formatCoordinateValue(coordinate.latitude)}, ${formatCoordinateValue(coordinate.longitude)}`;
}

export function buildAppleMapsUrl(coordinate: StoreCoordinate, label?: string): string {
  const coordinateText = formatCoordinates(coordinate).replace(" ", "");
  const params = [`ll=${coordinateText}`];

  if (label) {
    params.push(`q=${encodeURIComponent(label)}`);
  }

  return `maps://?${params.join("&")}`;
}

export function buildAppleMapsWebUrl(coordinate: StoreCoordinate, label?: string): string {
  const coordinateText = formatCoordinates(coordinate).replace(" ", "");
  const params = [`ll=${coordinateText}`];

  if (label) {
    params.push(`q=${encodeURIComponent(label)}`);
  }

  return `https://maps.apple.com/?${params.join("&")}`;
}

export function buildAppleMapsLegacyUrl(coordinate: StoreCoordinate, label?: string): string {
  return buildAppleMapsWebUrl(coordinate, label).replace("https://", "http://");
}

export function buildAndroidGeoUrl(coordinate: StoreCoordinate, label?: string): string {
  const coordinateText = formatCoordinates(coordinate).replace(" ", "");
  const query = label ? `${coordinateText}(${label})` : coordinateText;

  return `geo:${coordinateText}?q=${encodeURIComponent(query)}`;
}

export function buildMapsUrlForPlatform(
  coordinate: StoreCoordinate,
  platform: MapsPlatform,
  label?: string
): string {
  return buildMapsUrlsForPlatform(coordinate, platform, label)[0];
}

export function buildMapsUrlsForPlatform(
  coordinate: StoreCoordinate,
  platform: MapsPlatform,
  label?: string
): string[] {
  if (platform === "android") {
    return [buildAndroidGeoUrl(coordinate, label)];
  }

  if (platform === "ios") {
    return [
      buildAppleMapsUrl(coordinate, label),
      buildAppleMapsWebUrl(coordinate, label),
      buildAppleMapsLegacyUrl(coordinate, label)
    ];
  }

  return [buildAppleMapsWebUrl(coordinate, label)];
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function formatCoordinateValue(value: number): string {
  return value.toFixed(COORDINATE_PRECISION);
}
