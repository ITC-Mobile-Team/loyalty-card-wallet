import type { MapsPlatform, StoreCoordinate } from "./storeCoordinates";
import { buildMapsUrlsForPlatform, formatCoordinates } from "./storeCoordinates";

export type CoordinateActionResult =
  | {
      message?: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export type StoreCoordinateActionDependencies = {
  copyText(text: string): Promise<unknown>;
  openUrl(url: string): Promise<unknown>;
};

export type StoreCoordinateActionOptions = {
  coordinate: StoreCoordinate;
  dependencies: StoreCoordinateActionDependencies;
  platform: MapsPlatform;
  storeName: string;
};

export const COPY_COORDINATES_SUCCESS_MESSAGE = "Coordinates copied.";
export const COPY_COORDINATES_ERROR_MESSAGE = "Could not copy coordinates. Try copying them manually.";
export const OPEN_MAPS_ERROR_MESSAGE = "Could not open maps. Try copying the coordinates instead.";

export function createStoreCoordinateActions({
  coordinate,
  dependencies,
  platform,
  storeName
}: StoreCoordinateActionOptions) {
  const coordinateText = formatCoordinates(coordinate);

  return {
    async copyCoordinates(): Promise<CoordinateActionResult> {
      try {
        await dependencies.copyText(coordinateText);

        return { message: COPY_COORDINATES_SUCCESS_MESSAGE, ok: true };
      } catch {
        return { message: COPY_COORDINATES_ERROR_MESSAGE, ok: false };
      }
    },
    async openInMaps(): Promise<CoordinateActionResult> {
      const urls = buildMapsUrlsForPlatform(coordinate, platform, storeName);

      for (const url of urls) {
        try {
          await dependencies.openUrl(url);

          return { ok: true };
        } catch {
          continue;
        }
      }

      return { message: OPEN_MAPS_ERROR_MESSAGE, ok: false };
    }
  };
}
