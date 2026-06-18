import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCardNumberForDisplay,
  getCardAccessibilityLabel,
  getCardInitials,
  getCardNumberSuffix
} from "../src/domain/cards/card-display";
import type { LoyaltyCard } from "../src/domain/cards/Card";

const card: LoyaltyCard = {
  barcodeFormat: "code128",
  cardNumber: "123456789012",
  createdAt: "2026-06-10T00:00:00.000Z",
  id: "card_test",
  storeName: "Coffee Club",
  updatedAt: "2026-06-10T00:00:00.000Z"
};

test("getCardInitials derives one or two stable initials from store name", () => {
  assert.equal(getCardInitials("Coffee Club"), "CC");
  assert.equal(getCardInitials("  Market  "), "M");
  assert.equal(getCardInitials(""), "?");
});

test("card number display helpers format suffixes and groups", () => {
  assert.equal(getCardNumberSuffix("1234 5678 9012"), "9012");
  assert.equal(formatCardNumberForDisplay("123456789012"), "1234 5678 9012");
});

test("getCardAccessibilityLabel includes the merchant and card suffix", () => {
  assert.equal(getCardAccessibilityLabel(card), "Coffee Club, ending in 9012");
});
