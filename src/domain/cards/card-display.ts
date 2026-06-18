import type { LoyaltyCard } from "./Card";

export function getCardInitials(storeName: string): string {
  const words = storeName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function getCardNumberSuffix(cardNumber: string, length = 4): string {
  const normalized = cardNumber.replace(/\s+/g, "");
  return normalized.slice(Math.max(0, normalized.length - length));
}

export function formatCardNumberForDisplay(cardNumber: string): string {
  const normalized = cardNumber.replace(/\s+/g, "");

  if (normalized.length <= 4) {
    return normalized;
  }

  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

export function getCardAccessibilityLabel(card: LoyaltyCard): string {
  const suffix = getCardNumberSuffix(card.cardNumber);
  return suffix.length > 0 ? `${card.storeName}, ending in ${suffix}` : card.storeName;
}
