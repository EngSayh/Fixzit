/**
 * @file Database Indexes Barrel
 * @description Re-exports all index-related functions for centralized access.
 * @module lib/db/indexes
 */

export {
  createQaIndexes,
  ensureQaIndexes,
} from "./qa-indexes";

export {
  dropAllLegacyIndexes,
  dropLegacyUserIndexes,
  dropLegacyWorkOrderIndexes,
  dropLegacyInvoiceIndexes,
  dropLegacySubscriptionInvoiceIndexes,
  dropLegacyAssetIndexes,
  dropLegacySLAIndexes,
  dropLegacySupportTicketIndexes,
  dropLegacyFMApprovalIndexes,
  dropLegacyEmployeeIndexes,
  dropLegacyErrorEventIndexes,
  dropLegacyClaimIndexes,
  dropLegacyRmaIndexes,
  dropLegacyAdvertisingIndexes,
  dropLegacyFeeScheduleIndexes,
  dropLegacyGlobalUniqueIndexes,
  dropLegacyQaIndexes,
} from "./legacy-cleanup";
