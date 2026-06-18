import assert from "node:assert/strict";
import test from "node:test";

import {
  COPY_COORDINATES_ERROR_MESSAGE,
  COPY_COORDINATES_SUCCESS_MESSAGE,
  OPEN_MAPS_ERROR_MESSAGE,
  createStoreCoordinateActions
} from "../src/features/stores/storeCoordinateActions";
import type { StoreCoordinate } from "../src/features/stores/storeCoordinates";

const coordinate: StoreCoordinate = {
  latitude: 50.45,
  longitude: 30.52
};

test("store coordinate actions open the platform maps URL through the injected dependency", async () => {
  const openedUrls: string[] = [];
  const actions = createStoreCoordinateActions({
    coordinate,
    dependencies: {
      copyText: async () => undefined,
      openUrl: async (url) => {
        openedUrls.push(url);
      }
    },
    platform: "android",
    storeName: "Fresh Market"
  });

  const result = await actions.openInMaps();

  assert.equal(result.ok, true);
  assert.deepEqual(openedUrls, ["geo:50.45000,30.52000?q=50.45000%2C30.52000(Fresh%20Market)"]);
});

test("store coordinate actions report open maps failures", async () => {
  const attemptedUrls: string[] = [];
  const actions = createStoreCoordinateActions({
    coordinate,
    dependencies: {
      copyText: async () => undefined,
      openUrl: async (url) => {
        attemptedUrls.push(url);
        throw new Error("No maps app");
      }
    },
    platform: "ios",
    storeName: "Fresh Market"
  });

  const result = await actions.openInMaps();

  assert.equal(result.ok, false);
  assert.equal(result.message, OPEN_MAPS_ERROR_MESSAGE);
  assert.deepEqual(attemptedUrls, [
    "maps://?ll=50.45000,30.52000&q=Fresh%20Market",
    "https://maps.apple.com/?ll=50.45000,30.52000&q=Fresh%20Market",
    "http://maps.apple.com/?ll=50.45000,30.52000&q=Fresh%20Market"
  ]);
});

test("store coordinate actions retry iOS map URL fallbacks", async () => {
  const attemptedUrls: string[] = [];
  const actions = createStoreCoordinateActions({
    coordinate,
    dependencies: {
      copyText: async () => undefined,
      openUrl: async (url) => {
        attemptedUrls.push(url);

        if (attemptedUrls.length < 2) {
          throw new Error("First maps URL failed");
        }
      }
    },
    platform: "ios",
    storeName: "Fresh Market"
  });

  const result = await actions.openInMaps();

  assert.equal(result.ok, true);
  assert.deepEqual(attemptedUrls, [
    "maps://?ll=50.45000,30.52000&q=Fresh%20Market",
    "https://maps.apple.com/?ll=50.45000,30.52000&q=Fresh%20Market"
  ]);
});

test("store coordinate actions copy the formatted coordinate string", async () => {
  const copiedText: string[] = [];
  const actions = createStoreCoordinateActions({
    coordinate,
    dependencies: {
      copyText: async (text) => {
        copiedText.push(text);
      },
      openUrl: async () => undefined
    },
    platform: "ios",
    storeName: "Fresh Market"
  });

  const result = await actions.copyCoordinates();

  assert.equal(result.ok, true);
  assert.equal(result.message, COPY_COORDINATES_SUCCESS_MESSAGE);
  assert.deepEqual(copiedText, ["50.45000, 30.52000"]);
});

test("store coordinate actions report clipboard failures", async () => {
  const actions = createStoreCoordinateActions({
    coordinate,
    dependencies: {
      copyText: async () => {
        throw new Error("Clipboard denied");
      },
      openUrl: async () => undefined
    },
    platform: "ios",
    storeName: "Fresh Market"
  });

  const result = await actions.copyCoordinates();

  assert.equal(result.ok, false);
  assert.equal(result.message, COPY_COORDINATES_ERROR_MESSAGE);
});
