import { base64UrlToString, stringToBase64Url } from "../../core/encoding/base64url";
import { isBarcodeFormat } from "../cards/Card";

import type { ExportBundle, ExportedCard } from "./SharingPorts";

export const CARD_SHARE_LINK_APP_ID = "loyalty-card-wallet";
export const CARD_SHARE_LINK_KIND = "single-card";
export const CARD_SHARE_LINK_VERSION = 1;
export const MAX_SHARE_LINK_PAYLOAD_LENGTH = 4096;

export type CardShareLinkPayload = {
  app: typeof CARD_SHARE_LINK_APP_ID;
  shareKind: typeof CARD_SHARE_LINK_KIND;
  linkVersion: typeof CARD_SHARE_LINK_VERSION;
  createdAt: string;
  bundle: ExportBundle;
};

export function createCardShareLinkPayload(bundle: ExportBundle, createdAt: string): CardShareLinkPayload {
  const payload: CardShareLinkPayload = {
    app: CARD_SHARE_LINK_APP_ID,
    shareKind: CARD_SHARE_LINK_KIND,
    linkVersion: CARD_SHARE_LINK_VERSION,
    createdAt,
    bundle
  };

  assertSingleCardSharePayload(payload);
  return payload;
}

export function encodeCardSharePayload(payload: CardShareLinkPayload): string {
  assertSingleCardSharePayload(payload);

  const encoded = stringToBase64Url(JSON.stringify(payload));

  if (encoded.length > MAX_SHARE_LINK_PAYLOAD_LENGTH) {
    throw {
      kind: "importExport",
      message: "This card is too large to share as a link. Use account export instead."
    };
  }

  return encoded;
}

export function decodeCardSharePayload(encoded: string): CardShareLinkPayload {
  if (!encoded) {
    throw { kind: "validation", field: "payload", message: "Share link payload is required." };
  }

  if (encoded.length > MAX_SHARE_LINK_PAYLOAD_LENGTH) {
    throw {
      kind: "importExport",
      message: "This share link is too large to open."
    };
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(base64UrlToString(encoded));
  } catch (error) {
    if (isAppErrorLike(error)) {
      throw error;
    }

    throw { kind: "validation", field: "payload", message: "Share link payload is not valid." };
  }

  assertSingleCardSharePayload(decoded);
  return decoded;
}

export function assertSingleCardSharePayload(value: unknown): asserts value is CardShareLinkPayload {
  assertObject(value, "Share link payload must be an object.");

  if (value.app !== CARD_SHARE_LINK_APP_ID) {
    throw { kind: "importExport", message: "This link was not created by Loyalty Card Wallet." };
  }

  if (value.shareKind !== CARD_SHARE_LINK_KIND) {
    throw { kind: "importExport", message: "This share link type is not supported." };
  }

  if (typeof value.linkVersion !== "number") {
    throw { kind: "validation", field: "linkVersion", message: "Share link version is required." };
  }

  if (value.linkVersion > CARD_SHARE_LINK_VERSION) {
    throw { kind: "importExport", message: "This share link was created by a newer app version." };
  }

  if (value.linkVersion !== CARD_SHARE_LINK_VERSION) {
    throw { kind: "importExport", message: "This share link version is not supported." };
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    throw { kind: "validation", field: "createdAt", message: "Share link creation date is required." };
  }

  const bundle = validateSingleCardBundle(value.bundle);
  value.bundle = bundle;
}

function validateSingleCardBundle(value: unknown): ExportBundle {
  assertObject(value, "Shared card bundle must be an object.");

  if (value.app !== CARD_SHARE_LINK_APP_ID) {
    throw { kind: "importExport", message: "Shared card bundle was not created by Loyalty Card Wallet." };
  }

  if (value.formatVersion !== 1) {
    throw { kind: "importExport", message: "Shared card bundle format is not supported." };
  }

  if (typeof value.exportedAt !== "string" || !value.exportedAt.trim()) {
    throw { kind: "validation", field: "exportedAt", message: "Shared card export date is required." };
  }

  if (!Array.isArray(value.cards)) {
    throw { kind: "validation", field: "cards", message: "Shared card bundle cards must be an array." };
  }

  if (value.cards.length !== 1) {
    throw { kind: "validation", field: "cards", message: "Share links must contain exactly one card." };
  }

  return {
    app: CARD_SHARE_LINK_APP_ID,
    formatVersion: 1,
    exportedAt: value.exportedAt,
    cards: [validateSharedCard(value.cards[0])]
  };
}

function validateSharedCard(value: unknown): ExportedCard {
  assertObject(value, "Shared card must be an object.");

  if (typeof value.storeName !== "string" || !value.storeName.trim()) {
    throw { kind: "validation", field: "storeName", message: "Shared card store name is required." };
  }

  if (typeof value.cardNumber !== "string" || !value.cardNumber.trim()) {
    throw { kind: "validation", field: "cardNumber", message: "Shared card number is required." };
  }

  if (typeof value.barcodeFormat !== "string" || !isBarcodeFormat(value.barcodeFormat)) {
    throw { kind: "validation", field: "barcodeFormat", message: "Shared card barcode format is not supported." };
  }

  if (Array.isArray(value.images) && value.images.length > 0) {
    throw { kind: "importExport", message: "Card images are not supported in share links." };
  }

  if (value.images !== undefined && !Array.isArray(value.images)) {
    throw { kind: "validation", field: "images", message: "Shared card images must be an array." };
  }

  const card: ExportedCard = {
    storeName: value.storeName,
    cardNumber: value.cardNumber,
    barcodeFormat: value.barcodeFormat
  };

  if (typeof value.backgroundColor === "string") {
    card.backgroundColor = value.backgroundColor;
  }

  if (typeof value.notes === "string") {
    card.notes = value.notes;
  }

  return card;
}

function assertObject(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw { kind: "validation", message };
  }
}

function isAppErrorLike(error: unknown): error is { kind: string; message: string } {
  return Boolean(error && typeof error === "object" && "kind" in error && "message" in error);
}
