/**
 * FSIN Generator - Fixzit Standard Item Number
 * Generates unique 14-digit identifiers for products in Souq Marketplace
 * Format: FSIN-12345678901234 (14 digits with check digit)
 * @module lib/souq/fsin-generator
 */

import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";

export interface FSINMetadata {
  fsin: string;
  checkDigit: number;
  prefix: string;
  sequence: string;
  generatedAt: Date;
}

/**
 * FSIN Configuration
 */
const _FSIN_CONFIG = {
  PREFIX: "FX", // Fixzit prefix (2 chars)
  LENGTH: 14, // Total length including check digit
  SEQUENCE_LENGTH: 11, // 11 digits for sequence
  CHECK_DIGIT_LENGTH: 1, // 1 check digit
} as const;

/**
 * Generate a random sequence for FSIN
 * Uses cryptographically secure random number generation
 * @returns 11-digit sequence as string
 */
function generateSequence(): string {
  // Generate random bytes
  const buffer = randomBytes(8);
  const randomNumber = buffer.readBigUInt64BE(0);

  // Convert to 11-digit string with leading zeros
  const sequence = (randomNumber % BigInt(10 ** _FSIN_CONFIG.SEQUENCE_LENGTH))
    .toString()
    .padStart(_FSIN_CONFIG.SEQUENCE_LENGTH, "0");

  return sequence;
}

/**
 * Calculate check digit using Luhn algorithm (mod 10)
 * Used for error detection in FSIN
 * @param digits - String of digits to calculate check digit for
 * @returns Check digit (0-9)
 */
function calculateCheckDigit(digits: string): number {
  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  // Check digit makes sum divisible by 10
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

/**
 * Validate FSIN format and check digit
 * @param fsin - FSIN string to validate
 * @returns true if valid, false otherwise
 */
export function validateFSIN(fsin: string): boolean {
  // Remove any whitespace or dashes
  const cleaned = fsin.replace(/[\s-]/g, "");

  // Check length
  if (cleaned.length !== _FSIN_CONFIG.LENGTH) {
    return false;
  }

  // Check prefix
  if (!cleaned.startsWith(_FSIN_CONFIG.PREFIX)) {
    return false;
  }

  // Extract components
  const digitsOnly = cleaned.substring(_FSIN_CONFIG.PREFIX.length);

  // Check if all characters are digits
  if (!/^\d+$/.test(digitsOnly)) {
    return false;
  }

  // Validate check digit
  const providedCheckDigit = parseInt(digitsOnly[digitsOnly.length - 1], 10);
  const sequenceDigits = digitsOnly.substring(0, digitsOnly.length - 1);
  const calculatedCheckDigit = calculateCheckDigit(sequenceDigits);

  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Generate a new FSIN
 * @returns FSIN metadata object
 */
export function generateFSIN(): FSINMetadata {
  const sequence = generateSequence();
  const checkDigit = calculateCheckDigit(sequence);
  const fsin = `${_FSIN_CONFIG.PREFIX}${sequence}${checkDigit}`;

  return {
    fsin,
    checkDigit,
    prefix: _FSIN_CONFIG.PREFIX,
    sequence,
    generatedAt: new Date(),
  };
}

/**
 * Generate multiple FSINs
 * Ensures no collisions within the batch
 * @param count - Number of FSINs to generate
 * @returns Array of FSIN metadata objects
 */
export function generateFSINBatch(count: number): FSINMetadata[] {
  const fsins = new Set<string>();
  const results: FSINMetadata[] = [];

  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loops

  while (fsins.size < count && attempts < maxAttempts) {
    const metadata = generateFSIN();

    if (!fsins.has(metadata.fsin)) {
      fsins.add(metadata.fsin);
      results.push(metadata);
    }

    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error(
      `Failed to generate ${count} unique FSINs after ${maxAttempts} attempts`,
    );
  }

  return results;
}

/**
 * Format FSIN with dashes for display
 * Format: FX-12345-67890-1
 * @param fsin - FSIN string
 * @returns Formatted FSIN
 */
export function formatFSIN(fsin: string): string {
  const cleaned = fsin.replace(/[\s-]/g, "");

  if (cleaned.length !== _FSIN_CONFIG.LENGTH) {
    throw new Error(`Invalid FSIN length: ${cleaned.length}`);
  }

  // Format: FX-12345-67890-1
  return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 7)}-${cleaned.substring(7, 12)}-${cleaned.substring(12)}`;
}

/**
 * Parse FSIN into components
 * @param fsin - FSIN string
 * @returns Parsed components or null if invalid
 */
export function parseFSIN(fsin: string): FSINMetadata | null {
  if (!validateFSIN(fsin)) {
    return null;
  }

  const cleaned = fsin.replace(/[\s-]/g, "");
  const prefix = cleaned.substring(0, _FSIN_CONFIG.PREFIX.length);
  const digitsOnly = cleaned.substring(_FSIN_CONFIG.PREFIX.length);
  const sequence = digitsOnly.substring(0, digitsOnly.length - 1);
  const checkDigit = parseInt(digitsOnly[digitsOnly.length - 1], 10);

  return {
    fsin: cleaned,
    checkDigit,
    prefix,
    sequence,
    generatedAt: new Date(), // Unknown for parsed FSINs
  };
}

/**
 * Generate FSIN with custom prefix (for testing or special cases)
 * WARNING: Use only for testing. Production should use standard FX prefix.
 * @param customPrefix - Custom 2-character prefix
 * @returns FSIN metadata object
 */
export function generateFSINWithPrefix(customPrefix: string): FSINMetadata {
  if (customPrefix.length !== 2) {
    throw new Error("Custom prefix must be exactly 2 characters");
  }

  const sequence = generateSequence();
  const checkDigit = calculateCheckDigit(sequence);
  const fsin = `${customPrefix}${sequence}${checkDigit}`;

  return {
    fsin,
    checkDigit,
    prefix: customPrefix,
    sequence,
    generatedAt: new Date(),
  };
}

/**
 * Check if FSIN exists in database
 * Queries SouqProduct model to verify uniqueness
 * @param _fsin - FSIN to check
 * @returns Promise<boolean> true if exists, false otherwise
 * @throws Error if database query fails (prevents duplicate FSINs during outages)
 */
export async function fsinExists(_fsin: string, orgId: string): Promise<boolean> {
  if (!orgId) {
    throw new Error("orgId is required to check FSIN uniqueness (STRICT v4.1)");
  }
  if (!ObjectId.isValid(orgId)) {
    throw new Error("Invalid orgId for FSIN uniqueness check");
  }
  const orgFilter = new ObjectId(orgId);
  try {
    const { SouqProduct } = await import("@/server/models/souq/Product");
    const { connectDb } = await import("@/lib/mongodb-unified");

    await connectDb();

    const product = await SouqProduct.findOne({
      fsin: _fsin,
      $or: [{ orgId: orgFilter }, { org_id: orgFilter }],
    })
      .select("_id")
      .lean();
    return !!product;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    // ✅ SECURITY FIX: Throw on DB errors to prevent duplicate FSINs during outages
    // If we can't query the DB, we can't guarantee uniqueness - fail hard
    logger.error(
      "[FSIN] Database lookup failed - cannot verify uniqueness",
      error as Error,
      { fsin: _fsin },
    );
    throw new Error(
      `FSIN uniqueness check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate unique FSIN with collision detection
 * Retries if FSIN already exists in database
 *
 * ⚠️ RACE CONDITION: This check-then-insert pattern is NOT atomic.
 * Two concurrent requests can both pass fsinExists() and insert the same FSIN.
 *
 * ✅ REQUIRED FIX: Add org-scoped unique index on SouqProduct.fsin field:
 *    souqProductSchema.index({ orgId: 1, fsin: 1 }, { unique: true });
 *
 * Then handle duplicate key errors (code 11000) in product creation:
 *    try { await SouqProduct.create({ fsin, ... }) }
 *    catch (err) { if (err.code === 11000) retry with new FSIN }
 *
 * @param maxRetries - Maximum retry attempts (default: 5)
 * @returns Promise<FSINMetadata>
 */
export async function generateUniqueFSIN(
  orgId: string,
  maxRetries = 5,
): Promise<FSINMetadata> {
  if (!orgId) {
    throw new Error("orgId is required to generate a unique FSIN (STRICT v4.1)");
  }
  let attempts = 0;

  while (attempts < maxRetries) {
    const metadata = generateFSIN();

    // Check if FSIN already exists
    const exists = await fsinExists(metadata.fsin, orgId);

    if (!exists) {
      return metadata;
    }

    attempts++;
  }

  throw new Error(
    `Failed to generate unique FSIN after ${maxRetries} attempts`,
  );
}

// Export for testing
export const _testing = {
  generateSequence,
  calculateCheckDigit,
  FSIN_CONFIG: _FSIN_CONFIG,
};

export default {
  generateFSIN,
  generateFSINBatch,
  generateUniqueFSIN,
  validateFSIN,
  formatFSIN,
  parseFSIN,
  fsinExists,
};
