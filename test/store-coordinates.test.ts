import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAndroidGeoUrl,
  buildAppleMapsLegacyUrl,
  buildAppleMapsUrl,
  buildAppleMapsWebUrl,
  buildMapsUrlForPlatform,
  buildMapsUrlsForPlatform,
  formatCoordinates,
  getValidStoreCoordinate,
  type StoreCoordinate
} from "../src/features/stores/storeCoordinates";

const KYIV_MARKET: StoreCoordinate = {
  latitude: 50.450001,
  longitude: 30.523333
};

test("store coordinate validation accepts finite in-range latitude and longitude", () => {
  assert.deepEqual(
    getValidStoreCoordinate({
      latitude: 50.45,
      longitude: 30.52
    }),
    {
      latitude: 50.45,
      longitude: 30.52
    }
  );
});

test("store coordinate validation rejects missing, non-finite, and out-of-range values", () => {
  assert.equal(getValidStoreCoordinate({ latitude: undefined, longitude: 30.52 }), null);
  assert.equal(getValidStoreCoordinate({ latitude: 50.45, longitude: undefined }), null);
  assert.equal(getValidStoreCoordinate({ latitude: Number.NaN, longitude: 30.52 }), null);
  assert.equal(getValidStoreCoordinate({ latitude: 91, longitude: 30.52 }), null);
  assert.equal(getValidStoreCoordinate({ latitude: 50.45, longitude: -181 }), null);
});

test("formatCoordinates returns a stable display string", () => {
  assert.equal(formatCoordinates(KYIV_MARKET), "50.45000, 30.52333");
});

test("buildAppleMapsUrl creates an Apple Maps URL with encoded store label", () => {
  assert.equal(
    buildAppleMapsUrl(KYIV_MARKET, "Fresh & Fine"),
    "maps://?ll=50.45000,30.52333&q=Fresh%20%26%20Fine"
  );
});

test("buildAppleMapsWebUrl creates universal and legacy web fallbacks", () => {
  assert.equal(
    buildAppleMapsWebUrl(KYIV_MARKET, "Fresh & Fine"),
    "https://maps.apple.com/?ll=50.45000,30.52333&q=Fresh%20%26%20Fine"
  );
  assert.equal(
    buildAppleMapsLegacyUrl(KYIV_MARKET, "Fresh & Fine"),
    "http://maps.apple.com/?ll=50.45000,30.52333&q=Fresh%20%26%20Fine"
  );
});

test("buildAndroidGeoUrl creates a geo URI with encoded query label", () => {
  assert.equal(
    buildAndroidGeoUrl(KYIV_MARKET, "Fresh & Fine"),
    "geo:50.45000,30.52333?q=50.45000%2C30.52333(Fresh%20%26%20Fine)"
  );
});

test("buildMapsUrlForPlatform uses geo only for Android", () => {
  assert.equal(buildMapsUrlForPlatform(KYIV_MARKET, "android", "Fresh").startsWith("geo:"), true);
  assert.equal(buildMapsUrlForPlatform(KYIV_MARKET, "ios", "Fresh").startsWith("maps://"), true);
  assert.equal(buildMapsUrlForPlatform(KYIV_MARKET, "web", "Fresh").startsWith("https://maps.apple.com/"), true);
});

test("buildMapsUrlsForPlatform creates iOS fallback candidates", () => {
  assert.deepEqual(buildMapsUrlsForPlatform(KYIV_MARKET, "ios", "Fresh"), [
    "maps://?ll=50.45000,30.52333&q=Fresh",
    "https://maps.apple.com/?ll=50.45000,30.52333&q=Fresh",
    "http://maps.apple.com/?ll=50.45000,30.52333&q=Fresh"
  ]);
});
