/**
 * Centralized ID generation utilities for the Fixzit platform.
 *
 * These functions replace Date.now()-based ID generation, which can collide
 * when multiple operations happen in the same millisecond (especially under
 * high load or in parallel processing).
 *
 * Uses `nanoid` for short, URL-safe unique identifiers.
 *
 * @module lib/id-generator
 */

import { nanoid, customAlphabet } from "nanoid";

/**
 * Alphabet for uppercase alphanumeric IDs (no confusing chars like 0/O, 1/I/L)
 */
const UPPERCASE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const upperNanoid = customAlphabet(UPPERCASE_ALPHABET, 8);

/**
 * Generate a short unique suffix (8 chars, uppercase alphanumeric)
 * Safe for use in human-readable IDs like REF-XXXXXXXX
 */
export function uniqueSuffix(): string {
  return upperNanoid();
}

/**
 * Generate a refund ID
 * Format: REF-{8 char unique}
 * Example: REF-A3K7HM2P
 */
export function generateRefundId(): string {
  return `REF-${upperNanoid()}`;
}

/**
 * Generate a transaction ID
 * Format: TXN-{8 char unique}
 * Example: TXN-B4M8JN3Q
 */
export function generateTransactionId(): string {
  return `TXN-${upperNanoid()}`;
}

/**
 * Generate a claim ID
 * Format: CLM-{8 char unique}
 * Example: CLM-C5N9KP4R
 */
export function generateClaimId(): string {
  return `CLM-${upperNanoid()}`;
}

/**
 * Generate an inventory ID
 * Format: inv_{12 char nanoid}
 * Example: inv_V1StGXR8_Z5jdHi6B
 */
export function generateInventoryId(): string {
  return `inv_${nanoid(12)}`;
}

/**
 * Generate an inventory transaction ID
 * Format: txn_{12 char nanoid}
 * Example: txn_V1StGXR8_Z5jdHi6B
 */
export function generateInventoryTxnId(): string {
  return `txn_${nanoid(12)}`;
}

/**
 * Generate an escrow number
 * Format: ESC-{8 char unique}-{sourceIdSuffix}
 * Example: ESC-D6P2LQ5S-abc123
 */
export function generateEscrowNumber(sourceIdSuffix: string): string {
  return `ESC-${upperNanoid()}-${sourceIdSuffix}`;
}

/**
 * Generate a statement ID
 * Format: STMT-{8 char unique}-{sellerIdSuffix}
 * Example: STMT-E7Q3MR6T-SELLER
 */
export function generateStatementId(sellerIdSuffix: string): string {
  return `STMT-${upperNanoid()}-${sellerIdSuffix}`;
}

/**
 * Generate a withdrawal request ID
 * Format: WDR-{8 char unique}-{sellerIdSuffix}
 * Example: WDR-F8R4NS7U-SELLER
 */
export function generateWithdrawalRequestId(sellerIdSuffix: string): string {
  return `WDR-${upperNanoid()}-${sellerIdSuffix}`;
}

/**
 * Generate a withdrawal ID
 * Format: WD-{8 char unique}-{sellerIdPrefix}
 * Example: WD-G9S5PT8V-abc12345
 */
export function generateWithdrawalId(sellerIdPrefix: string): string {
  return `WD-${upperNanoid()}-${sellerIdPrefix}`;
}

/**
 * Generate a payout ID
 * Format: PAYOUT-{8 char unique}-{sellerIdSuffix}
 * Example: PAYOUT-H2T6QU9W-SELLER
 */
export function generatePayoutId(sellerIdSuffix: string): string {
  return `PAYOUT-${upperNanoid()}-${sellerIdSuffix}`;
}

/**
 * Generate a batch ID for scheduled operations
 * Format: BATCH-{date}-{8 char unique}
 * Example: BATCH-2024-01-15-J3V7RW2X
 */
export function generateBatchId(date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `BATCH-${dateStr}-${upperNanoid()}`;
}

/**
 * Generate a job ID for background tasks
 * Format: {prefix}-{8 char unique}
 * Example: auto-complete-K4W8SX3Y
 */
export function generateJobId(prefix: string): string {
  return `${prefix}-${upperNanoid()}`;
}

/**
 * Generate a return tracking number
 * Format: RET-{8 char unique}-{rmaSuffix}
 * Example: RET-L5X9TY4Z-ABC123
 */
export function generateReturnTrackingNumber(rmaSuffix: string): string {
  return `RET-${upperNanoid()}-${rmaSuffix}`;
}

/**
 * Generate a temporary seller ID for KYC verification
 * Format: TEMP-{nanoid}
 * Example: TEMP-V1StGXR8_Z5j
 */
export function generateTempSellerId(): string {
  return `TEMP-${nanoid(12)}`;
}

/**
 * Generate a generic prefixed ID
 * Use this when you need a custom prefix not covered by specific functions
 * Format: {PREFIX}-{8 char unique}
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}-${upperNanoid()}`;
}
