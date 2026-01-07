/**
 * @fileoverview Invoice Auto-Approval Service
 * @module services/finance/invoice-auto-approval
 *
 * AUTO-002: Implements threshold-based auto-approval for invoices
 * - Auto-approve invoices under configurable threshold (default: SAR 1000)
 * - Requires matching PO for auto-approval
 * - Tenant-scoped configuration
 * - Full audit trail
 *
 * @status PRODUCTION
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

// ============================================================================
// Types & Configuration
// ============================================================================

export interface AutoApprovalConfig {
  enabled: boolean;
  thresholdAmount: number;
  currency: string;
  requireMatchingPO: boolean;
  allowedCategories: string[];
  excludedVendors: string[];
  maxDailyAutoApprovals: number;
  approvalHoursStart: number;
  approvalHoursEnd: number;
  weekendsEnabled: boolean;
}

export interface AutoApprovalResult {
  invoiceId: string;
  approved: boolean;
  reason: string;
  autoApprovedAt?: Date;
  approvalDetails?: {
    thresholdCheck: boolean;
    poMatchCheck: boolean;
    categoryCheck: boolean;
    vendorCheck: boolean;
    dailyLimitCheck: boolean;
    businessHoursCheck: boolean;
  };
}

export interface Invoice {
  _id: ObjectId;
  orgId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  vendorId?: string;
  poNumber?: string;
  category?: string;
  status: string;
  createdAt: Date;
}

const DEFAULT_CONFIG: AutoApprovalConfig = {
  enabled: true,
  thresholdAmount: 1000,
  currency: "SAR",
  requireMatchingPO: true,
  allowedCategories: ["MAINTENANCE", "SUPPLIES", "UTILITIES", "SERVICES"],
  excludedVendors: [],
  maxDailyAutoApprovals: 50,
  approvalHoursStart: 8,
  approvalHoursEnd: 17,
  weekendsEnabled: false,
};

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Get auto-approval configuration for an organization
 */
export async function getAutoApprovalConfig(
  orgId: string
): Promise<AutoApprovalConfig> {
  try {
    const db = await getDatabase();
    const configDoc = await db
      .collection(COLLECTIONS.ORGANIZATION_SETTINGS)
      .findOne({ orgId, settingType: "invoice_auto_approval" });

    if (configDoc?.config) {
      return { ...DEFAULT_CONFIG, ...configDoc.config };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    logger.warn("[InvoiceAutoApproval] Failed to load config, using defaults", {
      orgId,
      error,
    });
    return DEFAULT_CONFIG;
  }
}

/**
 * Update auto-approval configuration for an organization
 */
export async function updateAutoApprovalConfig(
  orgId: string,
  config: Partial<AutoApprovalConfig>,
  updatedBy: string
): Promise<AutoApprovalConfig> {
  const db = await getDatabase();
  const currentConfig = await getAutoApprovalConfig(orgId);
  const newConfig = { ...currentConfig, ...config };

  await db.collection(COLLECTIONS.ORGANIZATION_SETTINGS).updateOne(
    { orgId, settingType: "invoice_auto_approval" },
    {
      $set: {
        config: newConfig,
        updatedAt: new Date(),
        updatedBy,
      },
      $setOnInsert: {
        createdAt: new Date(),
        createdBy: updatedBy,
      },
    },
    { upsert: true }
  );

  logger.info("[InvoiceAutoApproval] Config updated", { orgId, updatedBy });
  return newConfig;
}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHours(config: AutoApprovalConfig): boolean {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  // Check weekend
  if (!config.weekendsEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  // Check business hours
  return hour >= config.approvalHoursStart && hour < config.approvalHoursEnd;
}

/**
 * Get count of auto-approvals today for an org
 */
async function getDailyAutoApprovalCount(orgId: string): Promise<number> {
  const db = await getDatabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await db.collection(COLLECTIONS.INVOICES).countDocuments({
    orgId,
    autoApproved: true,
    autoApprovedAt: { $gte: startOfDay },
  });

  return count;
}

/**
 * Check if a PO exists and matches the invoice
 */
async function checkPOMatch(
  orgId: string,
  poNumber: string | undefined,
  amount: number
): Promise<boolean> {
  if (!poNumber) return false;

  const db = await getDatabase();
  // Purchase orders collection - not in COLLECTIONS constant yet
  const po = await db.collection("purchase_orders").findOne({
    orgId,
    poNumber,
    status: { $in: ["APPROVED", "OPEN"] },
  });

  if (!po) return false;

  // PO amount should be >= invoice amount
  const poAmount = (po.amount as number) || 0;
  return poAmount >= amount;
}

/**
 * Evaluate an invoice for auto-approval
 */
export async function evaluateForAutoApproval(
  invoice: Invoice
): Promise<AutoApprovalResult> {
  const orgId = invoice.orgId;
  const config = await getAutoApprovalConfig(orgId);

  const result: AutoApprovalResult = {
    invoiceId: invoice._id.toString(),
    approved: false,
    reason: "",
    approvalDetails: {
      thresholdCheck: false,
      poMatchCheck: false,
      categoryCheck: false,
      vendorCheck: false,
      dailyLimitCheck: false,
      businessHoursCheck: false,
    },
  };

  // Check if auto-approval is enabled
  if (!config.enabled) {
    result.reason = "Auto-approval is disabled for this organization";
    return result;
  }

  // Check business hours
  result.approvalDetails!.businessHoursCheck = isWithinBusinessHours(config);
  if (!result.approvalDetails!.businessHoursCheck) {
    result.reason = "Outside business hours for auto-approval";
    return result;
  }

  // Check threshold
  result.approvalDetails!.thresholdCheck =
    invoice.amount <= config.thresholdAmount &&
    invoice.currency === config.currency;
  if (!result.approvalDetails!.thresholdCheck) {
    result.reason = `Invoice amount (${invoice.amount} ${invoice.currency}) exceeds threshold (${config.thresholdAmount} ${config.currency})`;
    return result;
  }

  // Check PO match if required
  if (config.requireMatchingPO) {
    result.approvalDetails!.poMatchCheck = await checkPOMatch(
      orgId,
      invoice.poNumber,
      invoice.amount
    );
    if (!result.approvalDetails!.poMatchCheck) {
      result.reason = "No matching PO found or PO amount insufficient";
      return result;
    }
  } else {
    result.approvalDetails!.poMatchCheck = true;
  }

  // Check category
  result.approvalDetails!.categoryCheck =
    !invoice.category ||
    config.allowedCategories.includes(invoice.category);
  if (!result.approvalDetails!.categoryCheck) {
    result.reason = `Category '${invoice.category}' is not allowed for auto-approval`;
    return result;
  }

  // Check vendor exclusions
  result.approvalDetails!.vendorCheck =
    !invoice.vendorId ||
    !config.excludedVendors.includes(invoice.vendorId);
  if (!result.approvalDetails!.vendorCheck) {
    result.reason = "Vendor is excluded from auto-approval";
    return result;
  }

  // Check daily limit
  const dailyCount = await getDailyAutoApprovalCount(orgId);
  result.approvalDetails!.dailyLimitCheck =
    dailyCount < config.maxDailyAutoApprovals;
  if (!result.approvalDetails!.dailyLimitCheck) {
    result.reason = `Daily auto-approval limit (${config.maxDailyAutoApprovals}) reached`;
    return result;
  }

  // All checks passed
  result.approved = true;
  result.reason = "All auto-approval criteria met";
  result.autoApprovedAt = new Date();

  return result;
}

/**
 * Process auto-approval for an invoice
 */
export async function processAutoApproval(
  invoiceId: string,
  orgId: string
): Promise<AutoApprovalResult> {
  const db = await getDatabase();

  // Fetch invoice
  const invoice = await db.collection(COLLECTIONS.INVOICES).findOne({
    _id: new ObjectId(invoiceId),
    orgId,
  });

  if (!invoice) {
    return {
      invoiceId,
      approved: false,
      reason: "Invoice not found",
    };
  }

  if (invoice.status !== "PENDING") {
    return {
      invoiceId,
      approved: false,
      reason: `Invoice status is '${invoice.status}', not PENDING`,
    };
  }

  // Evaluate for auto-approval
  const result = await evaluateForAutoApproval(invoice as unknown as Invoice);

  if (result.approved) {
    // Update invoice status
    await db.collection(COLLECTIONS.INVOICES).updateOne(
      { _id: new ObjectId(invoiceId), orgId },
      {
        $set: {
          status: "APPROVED",
          autoApproved: true,
          autoApprovedAt: result.autoApprovedAt,
          approvalDetails: result.approvalDetails,
          updatedAt: new Date(),
        },
      }
    );

    // Log to audit trail
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      orgId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "auto_approved",
      details: result.approvalDetails,
      timestamp: new Date(),
      actor: "SYSTEM:AUTO_APPROVAL",
    });

    logger.info("[InvoiceAutoApproval] Invoice auto-approved", {
      invoiceId,
      orgId,
      amount: invoice.amount,
    });
  } else {
    logger.debug("[InvoiceAutoApproval] Invoice not eligible for auto-approval", {
      invoiceId,
      orgId,
      reason: result.reason,
    });
  }

  return result;
}

/**
 * Batch process pending invoices for auto-approval
 */
export async function batchProcessAutoApprovals(
  orgId: string
): Promise<{ processed: number; approved: number; results: AutoApprovalResult[] }> {
  const db = await getDatabase();
  const config = await getAutoApprovalConfig(orgId);

  if (!config.enabled) {
    return { processed: 0, approved: 0, results: [] };
  }

  // Find pending invoices under threshold
  const pendingInvoices = await db
    .collection(COLLECTIONS.INVOICES)
    .find({
      orgId,
      status: "PENDING",
      amount: { $lte: config.thresholdAmount },
      currency: config.currency,
    })
    .limit(100)
    .toArray();

  const results: AutoApprovalResult[] = [];

  for (const invoice of pendingInvoices) {
    const result = await processAutoApproval(invoice._id.toString(), orgId);
    results.push(result);
  }

  const approved = results.filter((r) => r.approved).length;

  logger.info("[InvoiceAutoApproval] Batch processing complete", {
    orgId,
    processed: results.length,
    approved,
  });

  return {
    processed: results.length,
    approved,
    results,
  };
}
