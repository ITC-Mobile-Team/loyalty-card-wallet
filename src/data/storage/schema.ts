import type { BarcodeFormat } from "../../domain/cards/Card";
import type { ImageMimeType, ImageRole } from "../../domain/images/ImageStore";

export const DATABASE_NAME = "loyalty-card-wallet.db";

export const CURRENT_SCHEMA_VERSION = 4;

export const SUPPORTED_BARCODE_FORMATS: readonly BarcodeFormat[] = [
  "code128",
  "code39",
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf",
  "qr"
];

export const SUPPORTED_IMAGE_MIME_TYPES: readonly ImageMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

export const SUPPORTED_IMAGE_ROLES: readonly ImageRole[] = ["primary", "additional"];

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY NOT NULL,
  store_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  barcode_format TEXT NOT NULL CHECK (barcode_format IN ('code128', 'code39', 'ean13', 'ean8', 'upca', 'upce', 'itf', 'qr')),
  primary_image_id TEXT,
  thumbnail_image_id TEXT,
  background_color TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_store_name ON cards(store_name);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at);

CREATE TABLE IF NOT EXISTS image_payloads (
  data_ref TEXT PRIMARY KEY NOT NULL,
  bytes BLOB NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_images (
  id TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary', 'additional')),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  data_ref TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (data_ref) REFERENCES image_payloads(data_ref) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_images_card_id ON card_images(card_id);
CREATE INDEX IF NOT EXISTS idx_card_images_role ON card_images(card_id, role);
`;
