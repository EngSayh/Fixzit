/**
 * @file QA Index Creation Functions
 * @description Creates QA-related indexes for logs and alerts collections.
 * Extracted from lib/db/collections.ts for maintainability.
 * @module lib/db/indexes/qa-indexes
 */

import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";
import { getDatabase } from "@/lib/mongodb-unified";

/**
 * Create QA-specific indexes for logs and alerts collections.
 * Includes org-scoped indexes, platform-friendly global indexes, and TTL indexes.
 */
export async function createQaIndexes(db: Db): Promise<void> {
  // ============================================================================
  // QA LOGS - Multi-tenant isolation, platform queries, and TTL
  // ============================================================================

  // Org-scoped query index (sparse to exclude legacy docs without orgId)
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex(
      { orgId: 1, timestamp: -1 },
      {
        name: "qa_logs_orgId_timestamp",
        background: true,
        sparse: true,
      }
    );

  // Event-specific org-scoped query index
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex(
      { orgId: 1, event: 1, timestamp: -1 },
      {
        name: "qa_logs_orgId_event_timestamp",
        background: true,
        sparse: true,
      }
    );

  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex(
      { timestamp: -1 },
      {
        name: "qa_logs_timestamp_desc",
        background: true,
      }
    );

  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex(
      { event: 1, timestamp: -1 },
      {
        name: "qa_logs_event_timestamp",
        background: true,
      }
    );

  // TTL index: Auto-delete qa_logs after 90 days to bound storage growth
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex(
      { timestamp: 1 },
      {
        name: "qa_logs_ttl_90d",
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
        background: true,
      }
    );

  // ============================================================================
  // QA ALERTS - Multi-tenant isolation, platform queries, and TTL
  // ============================================================================

  // Org-scoped query index (sparse to exclude legacy docs without orgId)
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex(
      { orgId: 1, timestamp: -1 },
      {
        name: "qa_alerts_orgId_timestamp",
        background: true,
        sparse: true,
      }
    );

  // Event-specific org-scoped query index
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex(
      { orgId: 1, event: 1, timestamp: -1 },
      {
        name: "qa_alerts_orgId_event_timestamp",
        background: true,
        sparse: true,
      }
    );

  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex(
      { timestamp: -1 },
      {
        name: "qa_alerts_timestamp_desc",
        background: true,
      }
    );

  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex(
      { event: 1, timestamp: -1 },
      {
        name: "qa_alerts_event_timestamp",
        background: true,
      }
    );

  // TTL index: Auto-delete qa_alerts after 30 days to bound storage growth
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex(
      { timestamp: 1 },
      {
        name: "qa_alerts_ttl_30d",
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
        background: true,
      }
    );
}

let qaIndexesPromise: Promise<void> | null = null;

/**
 * Ensure QA-related indexes (logs/alerts) are created once per process start.
 * Guards against drift when migrations are skipped; idempotent via Mongo driver.
 */
export async function ensureQaIndexes(): Promise<void> {
  if (!qaIndexesPromise) {
    qaIndexesPromise = getDatabase()
      .then((db) => createQaIndexes(db))
      .catch((err) => {
        qaIndexesPromise = null;
        throw err;
      });
  }
  return qaIndexesPromise;
}
