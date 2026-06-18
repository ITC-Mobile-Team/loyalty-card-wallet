import type { AppError } from "@/core/errors/AppError";
import type { BarcodeFormat } from "@/domain/cards/Card";

export type BarcodeValidationSuccess = {
  displayValue: string;
  normalizedValue: string;
};

export type BarcodeValidationResult = BarcodeValidationSuccess | AppError;

const code39Pattern = /^[0-9A-Z ./$+%-]+$/;

export function validateBarcodeValue(format: BarcodeFormat, value: string): BarcodeValidationResult {
  switch (format) {
    case "code128":
      return validateCode128(value);
    case "code39":
      return validateCode39(value);
    case "ean13":
      return validateCheckedDigits(value, 13, "EAN-13");
    case "ean8":
      return validateCheckedDigits(value, 8, "EAN-8");
    case "upca":
      return validateCheckedDigits(value, 12, "UPC-A");
    case "upce":
      return validateUpcE(value);
    case "itf":
    case "qr":
      return unsupportedFormat(format);
  }
}

export function calculateGtinCheckDigit(body: string): number {
  let sum = 0;
  let multiplier = 3;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  return (10 - (sum % 10)) % 10;
}

export function expandUpcEToUpcA(value: string): string {
  const numberSystem = value[0];
  const digits = value.slice(1, 7);
  const checkDigit = value[7];
  const [d1, d2, d3, d4, d5, d6] = digits;

  if (d6 === "0" || d6 === "1" || d6 === "2") {
    return `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}${checkDigit}`;
  }

  if (d6 === "3") {
    return `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}${checkDigit}`;
  }

  if (d6 === "4") {
    return `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}${checkDigit}`;
  }

  return `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}${checkDigit}`;
}

function validateCode128(value: string): BarcodeValidationResult {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return validationError("cardNumber", "Card number is required.");
  }

  if (normalizedValue.length > 80) {
    return validationError("cardNumber", "Code 128 values must be 80 characters or fewer.");
  }

  for (const char of normalizedValue) {
    const code = char.charCodeAt(0);

    if (code < 32 || code > 127) {
      return validationError("cardNumber", "Code 128 supports printable ASCII characters only.");
    }
  }

  return {
    displayValue: normalizedValue,
    normalizedValue
  };
}

function validateCode39(value: string): BarcodeValidationResult {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue.length === 0) {
    return validationError("cardNumber", "Card number is required.");
  }

  if (normalizedValue.length > 80) {
    return validationError("cardNumber", "Code 39 values must be 80 characters or fewer.");
  }

  if (!code39Pattern.test(normalizedValue)) {
    return validationError(
      "cardNumber",
      "Code 39 supports uppercase letters, digits, spaces, and - . $ / + % only."
    );
  }

  return {
    displayValue: normalizedValue,
    normalizedValue
  };
}

function validateCheckedDigits(value: string, expectedLength: number, label: string): BarcodeValidationResult {
  const normalizedValue = value.replace(/[\s-]+/g, "");

  if (!new RegExp(`^\\d{${expectedLength}}$`).test(normalizedValue)) {
    return validationError("cardNumber", `${label} must contain exactly ${expectedLength} digits.`);
  }

  const body = normalizedValue.slice(0, -1);
  const expectedCheckDigit = calculateGtinCheckDigit(body);
  const actualCheckDigit = Number(normalizedValue.at(-1));

  if (actualCheckDigit !== expectedCheckDigit) {
    return validationError("cardNumber", `${label} check digit is invalid.`);
  }

  return {
    displayValue: normalizedValue,
    normalizedValue
  };
}

function validateUpcE(value: string): BarcodeValidationResult {
  const normalizedValue = value.replace(/[\s-]+/g, "");

  if (!/^[01]\d{7}$/.test(normalizedValue)) {
    return validationError("cardNumber", "UPC-E must contain 8 digits and start with number system 0 or 1.");
  }

  const expanded = expandUpcEToUpcA(normalizedValue);
  const body = expanded.slice(0, -1);
  const expectedCheckDigit = calculateGtinCheckDigit(body);
  const actualCheckDigit = Number(expanded.at(-1));

  if (actualCheckDigit !== expectedCheckDigit) {
    return validationError("cardNumber", "UPC-E check digit is invalid.");
  }

  return {
    displayValue: normalizedValue,
    normalizedValue
  };
}

function unsupportedFormat(format: BarcodeFormat): AppError {
  return {
    kind: "validation",
    field: "barcodeFormat",
    message: `${format.toUpperCase()} barcode rendering is not supported in this phase.`
  };
}

function validationError(field: string, message: string): AppError {
  return {
    kind: "validation",
    field,
    message
  };
}
