/**
 * @file Legacy Index Cleanup Functions
 * @description Drops legacy indexes that conflict with org-scoped canonical indexes.
 * Extracted from lib/db/collections.ts for maintainability.
 * @module lib/db/indexes/legacy-cleanup
 */

import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";
import { logger } from "@/lib/logger";

/**
 * Helper to check if an error indicates index not found (not a real error)
 */
function isIndexMissing(err: { code?: number; codeName?: string; message?: string }): boolean {
  return (
    err?.code === 27 ||
    err?.codeName === "IndexNotFound" ||
    !!err?.message?.includes("index not found")
  );
}

/**
 * Drop legacy user indexes that are either non-org-scoped or use default names,
 * so canonical org-scoped, named indexes can be created without collisions.
 */
export async function dropLegacyUserIndexes(db: Db): Promise<void> {
  const userIndexes = [
    // Global/non-org-scoped defaults
    "email_1",
    "phone_1",
    "username_1",
    "code_1",
    "employeeId_1",
    // Default-named orgId-prefixed variants (conflict with canonical named indexes)
    "orgId_1_email_1",
    "orgId_1_phone_1",
    "orgId_1_username_1",
    "orgId_1_code_1",
    "orgId_1_employeeId_1",
    "orgId_1_role_1",
    "orgId_1_professional.role_1",
    "orgId_1_professional.subRole_1",
    "orgId_1_personal.phone_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_assignment.assignedTo.vendorId_1",
    // Performance-related default-named indexes that conflict with canonical names
    "orgId_1_professional.skills.category_1",
    "orgId_1_workload.available_1",
    "orgId_1_performance.rating_-1",
    "orgId_1_isSuperAdmin_1",
    // Legacy unique name that used a conflicting partialFilterExpression
    "users_orgId_employeeId_unique",
  ];

  for (const indexName of userIndexes) {
    try {
      await db.collection(COLLECTIONS.USERS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy user index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy work order indexes that use default names and conflict with canonical named indexes.
 */
export async function dropLegacyWorkOrderIndexes(db: Db): Promise<void> {
  const workOrderIndexes = [
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_priority_1_sla.status_1",
    "orgId_1_status_1_createdAt_-1",
    "orgId_1_location.propertyId_1",
    "orgId_1_location.propertyId_1_status_1",
    "orgId_1_location.unitNumber_1_status_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_assignment.assignedTo.vendorId_1",
    "orgId_1_requester.userId_1",
    "orgId_1_scheduledDate_1",
    "orgId_1_createdAt_-1",
    "orgId_1_updatedAt_-1",
    "orgId_1_category_1",
    "orgId_1_subCategory_1",
    "orgId_1_type_1",
    "sla.resolutionDeadline_1",
    "orgId_1_title_text_description_text_work.solutionDescription_text",
    "title_text_description_text_work.solutionDescription_text",
  ];

  for (const indexName of workOrderIndexes) {
    try {
      await db.collection(COLLECTIONS.WORK_ORDERS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy work order index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy invoice indexes that use default names and conflict with canonical named indexes.
 */
export async function dropLegacyInvoiceIndexes(db: Db): Promise<void> {
  const invoiceIndexes = [
    "orgId_1_status_1",
    "orgId_1_dueDate_1",
    "orgId_1_customerId_1",
    "orgId_1_issueDate_-1",
    "orgId_1_number_1",
    "orgId_1_recipient.customerId_1",
    "orgId_1_zatca.status_1",
    "orgId_1_type_1_status_1",
  ];

  for (const indexName of invoiceIndexes) {
    try {
      await db.collection(COLLECTIONS.INVOICES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy invoice index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy subscription invoice indexes.
 */
export async function dropLegacySubscriptionInvoiceIndexes(db: Db): Promise<void> {
  const subscriptionInvoiceIndexes = [
    "orgId_1_status_1_dueDate_1",
    "orgId_1_subscriptionId_1_dueDate_-1",
    "orgId_1_subscriptionId_1",
  ];

  for (const indexName of subscriptionInvoiceIndexes) {
    try {
      await db.collection(COLLECTIONS.SUBSCRIPTION_INVOICES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy subscription invoice index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy asset indexes.
 */
export async function dropLegacyAssetIndexes(db: Db): Promise<void> {
  const assetIndexes = [
    "orgId_1_type_1",
    "orgId_1_status_1",
    "orgId_1_pmSchedule.nextPM_1",
    "orgId_1_condition.score_1",
    "orgId_1_code_1",
    "orgId_1_location.propertyId_1",
    "orgId_1_location.unitId_1",
    "orgId_1_assignedTo_1",
    "orgId_1_serialNumber_1",
  ];

  for (const indexName of assetIndexes) {
    try {
      await db.collection(COLLECTIONS.ASSETS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy asset index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy SLA indexes.
 */
export async function dropLegacySLAIndexes(db: Db): Promise<void> {
  const slaIndexes = [
    "orgId_1_type_1",
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_code_1",
    "orgId_1_isActive_1",
  ];

  for (const indexName of slaIndexes) {
    try {
      await db.collection(COLLECTIONS.SLAS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy SLA index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy support ticket indexes.
 */
export async function dropLegacySupportTicketIndexes(db: Db): Promise<void> {
  const supportTicketIndexes = [
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_createdAt_-1",
  ];

  for (const indexName of supportTicketIndexes) {
    try {
      await db.collection(COLLECTIONS.SUPPORT_TICKETS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy support ticket index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy FM approval indexes.
 */
export async function dropLegacyFMApprovalIndexes(db: Db): Promise<void> {
  const fmApprovalIndexes = [
    "orgId_1_approvalNumber_1",
    "orgId_1_status_1",
    "orgId_1_requestedBy.userId_1",
    "orgId_1_createdAt_-1",
  ];

  for (const indexName of fmApprovalIndexes) {
    try {
      await db.collection(COLLECTIONS.FM_APPROVALS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy FM approval index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy employee indexes.
 */
export async function dropLegacyEmployeeIndexes(db: Db): Promise<void> {
  const employeeIndexes = [
    "orgId_1_status_1",
    "orgId_1_department_1",
    "orgId_1_position_1",
    "orgId_1_employeeId_1",
    "orgId_1_email_1",
    "orgId_1_supervisorId_1",
    "orgId_1_hireDate_1",
    "orgId_1_terminationDate_1",
  ];

  for (const indexName of employeeIndexes) {
    try {
      await db.collection(COLLECTIONS.EMPLOYEES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy employee index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy error events indexes.
 */
export async function dropLegacyErrorEventIndexes(db: Db): Promise<void> {
  const errorEventIndexes = [
    "error_events_org_incidentKey",
    "orgId_1_incidentKey_1",
    "orgId_1_createdAt_-1",
    "orgId_1_severity_1",
    "orgId_1_status_1",
  ];

  for (const indexName of errorEventIndexes) {
    try {
      await db.collection(COLLECTIONS.ERROR_EVENTS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy error event index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy claims indexes.
 */
export async function dropLegacyClaimIndexes(db: Db): Promise<void> {
  const claimIndexes = [
    "claimId_1",
    "status_1_createdAt_-1",
    "buyerId_1_status_1",
    "sellerId_1_status_1",
    "sellerId_1_createdAt_-1",
    "sellerResponseDeadline_1_status_1",
    "assignedTo_1_status_1",
    "orgId_1_status_1",
    "orgId_1_claimId_1",
  ];

  for (const indexName of claimIndexes) {
    try {
      await db.collection(COLLECTIONS.CLAIMS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy claim index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy RMA indexes.
 */
export async function dropLegacyRmaIndexes(db: Db): Promise<void> {
  const rmaIndexes = [
    "rmaId_1",
    "status_1_createdAt_-1",
    "buyerId_1_status_1",
    "sellerId_1_status_1",
    "sellerId_1_createdAt_-1",
    "returnDeadline_1",
    "orgId_1_status_1",
    "orgId_1_rmaId_1",
  ];

  for (const indexName of rmaIndexes) {
    try {
      await db.collection(COLLECTIONS.SOUQ_RMAS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy RMA index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy advertising indexes.
 */
export async function dropLegacyAdvertisingIndexes(db: Db): Promise<void> {
  const targets: Array<{ collection: string; indexes: string[] }> = [
    {
      collection: COLLECTIONS.SOUQ_CAMPAIGNS,
      indexes: [
        "campaignId_1",
        "sellerId_1_status_1",
        "startAt_1_endAt_1",
        "stats.spend_-1",
        "orgId_1_campaignId_1",
      ],
    },
    {
      collection: COLLECTIONS.SOUQ_AD_GROUPS,
      indexes: ["adGroupId_1", "campaignId_1_status_1", "orgId_1_adGroupId_1"],
    },
    {
      collection: COLLECTIONS.SOUQ_ADS,
      indexes: ["adId_1", "adGroupId_1_status_1", "productId_1_status_1", "qualityScore_-1", "orgId_1_adId_1"],
    },
    {
      collection: COLLECTIONS.SOUQ_AD_TARGETS,
      indexes: [
        "targetId_1",
        "adGroupId_1_status_1_isNegative_1",
        "targetType_1_status_1",
        "keyword_1_matchType_1",
        "orgId_1_targetId_1",
      ],
    },
  ];

  for (const { collection, indexes } of targets) {
    for (const indexName of indexes) {
      try {
        await db.collection(collection).dropIndex(indexName);
      } catch (error) {
        const err = error as { code?: number; codeName?: string; message?: string };
        if (isIndexMissing(err)) continue;
        logger.warn("[indexes] Failed to drop legacy advertising index", {
          collection,
          indexName,
          error: err?.message,
        });
      }
    }
  }
}

/**
 * Drop legacy fee schedule indexes.
 */
export async function dropLegacyFeeScheduleIndexes(db: Db): Promise<void> {
  const feeIndexes = [
    "feeScheduleId_1",
    "version_1",
    "isActive_1_effectiveFrom_-1",
    "orgId_1_feeScheduleId_1",
  ];

  for (const indexName of feeIndexes) {
    try {
      await db.collection(COLLECTIONS.SOUQ_FEE_SCHEDULES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      if (isIndexMissing(err)) continue;
      logger.warn("[indexes] Failed to drop legacy fee schedule index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy global unique indexes.
 */
export async function dropLegacyGlobalUniqueIndexes(db: Db): Promise<void> {
  const globalIndexes: Array<{ collection: string; indexes: string[] }> = [
    { collection: COLLECTIONS.TENANTS, indexes: ["domain_1", "slug_1"] },
    { collection: COLLECTIONS.ORGANIZATIONS, indexes: ["slug_1", "domain_1"] },
    { collection: COLLECTIONS.API_KEYS, indexes: ["key_1"] },
    { collection: COLLECTIONS.SOUQ_SELLERS, indexes: ["sellerId_1", "orgId_1_sellerId_1"] },
    { collection: COLLECTIONS.SOUQ_PRODUCTS, indexes: ["productId_1", "orgId_1_productId_1"] },
    { collection: COLLECTIONS.SOUQ_LISTINGS, indexes: ["listingId_1", "orgId_1_listingId_1"] },
    { collection: COLLECTIONS.SOUQ_ORDERS, indexes: ["orderId_1", "orgId_1_orderId_1"] },
    { collection: COLLECTIONS.SOUQ_TRANSACTIONS, indexes: ["transactionId_1", "orgId_1_transactionId_1"] },
    { collection: COLLECTIONS.SOUQ_SETTLEMENTS, indexes: ["settlementId_1", "orgId_1_settlementId_1"] },
    {
      collection: COLLECTIONS.SOUQ_SETTLEMENT_STATEMENTS,
      indexes: ["statementId_1", "orgId_1_statementId_1"],
    },
    {
      collection: COLLECTIONS.SOUQ_WITHDRAWAL_REQUESTS,
      indexes: ["withdrawalRequestId_1", "orgId_1_withdrawalRequestId_1"],
    },
    { collection: COLLECTIONS.SOUQ_WITHDRAWALS, indexes: ["withdrawalId_1", "orgId_1_withdrawalId_1"] },
    { collection: COLLECTIONS.SOUQ_PAYOUTS, indexes: ["payoutId_1", "orgId_1_payoutId_1"] },
    { collection: COLLECTIONS.SOUQ_PAYOUT_BATCHES, indexes: ["batchId_1", "orgId_1_batchId_1"] },
    { collection: COLLECTIONS.SOUQ_REFUNDS, indexes: ["refundId_1", "orgId_1_refundId_1"] },
    { collection: COLLECTIONS.SOUQ_AD_BIDS, indexes: ["bidId_1", "orgId_1_bidId_1"] },
    { collection: COLLECTIONS.SOUQ_AD_EVENTS, indexes: ["eventId_1", "orgId_1_eventId_1"] },
    { collection: COLLECTIONS.SOUQ_AD_STATS, indexes: ["statsId_1", "orgId_1_statsId_1"] },
    { collection: COLLECTIONS.SOUQ_AD_DAILY_SPEND, indexes: ["spendId_1", "orgId_1_spendId_1"] },
  ];

  for (const { collection, indexes } of globalIndexes) {
    for (const indexName of indexes) {
      try {
        await db.collection(collection).dropIndex(indexName);
      } catch (error) {
        const err = error as { code?: number; codeName?: string; message?: string };
        if (isIndexMissing(err)) continue;
        logger.warn("[indexes] Failed to drop legacy global unique index", {
          collection,
          indexName,
          error: err?.message,
        });
      }
    }
  }
}

/**
 * Drop legacy QA indexes.
 */
export async function dropLegacyQaIndexes(db: Db): Promise<void> {
  const qaCollections = [COLLECTIONS.QA_LOGS, COLLECTIONS.QA_ALERTS];
  const qaIndexes = [
    "orgId_1_timestamp_-1",
    "orgId_1_event_1_timestamp_-1",
    "timestamp_-1",
    "event_1_timestamp_-1",
    "timestamp_1",
  ];

  for (const collection of qaCollections) {
    for (const indexName of qaIndexes) {
      try {
        await db.collection(collection).dropIndex(indexName);
      } catch (error) {
        const err = error as { code?: number; codeName?: string; message?: string };
        if (isIndexMissing(err)) continue;
        logger.warn(`[indexes] Failed to drop legacy QA index`, {
          collection,
          indexName,
          error: err?.message,
        });
      }
    }
  }
}

/**
 * Master function to drop all legacy indexes across all collections.
 * Call this before creating indexes to avoid conflicts.
 */
export async function dropAllLegacyIndexes(db: Db): Promise<void> {
  await Promise.all([
    dropLegacyUserIndexes(db),
    dropLegacyWorkOrderIndexes(db),
    dropLegacyInvoiceIndexes(db),
    dropLegacySubscriptionInvoiceIndexes(db),
    dropLegacyAssetIndexes(db),
    dropLegacySLAIndexes(db),
    dropLegacySupportTicketIndexes(db),
    dropLegacyFMApprovalIndexes(db),
    dropLegacyEmployeeIndexes(db),
    dropLegacyErrorEventIndexes(db),
    dropLegacyClaimIndexes(db),
    dropLegacyRmaIndexes(db),
    dropLegacyAdvertisingIndexes(db),
    dropLegacyFeeScheduleIndexes(db),
    dropLegacyGlobalUniqueIndexes(db),
    dropLegacyQaIndexes(db),
  ]);
}
