/**
 * @fileoverview SLA Breach Detection and Alert Service
 * @module services/fm/sla-breach-service
 *
 * Monitors work orders for SLA breaches and sends alerts to managers/assignees.
 * Supports configurable thresholds, escalation paths, and multi-channel notifications.
 */

import { Types } from "mongoose";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { differenceInMinutes, differenceInHours } from "date-fns";
import type { WorkOrderPriority } from "@/lib/sla";

/**
 * SLA breach status levels
 */
export type SlaBreachLevel = "approaching" | "breached" | "critical";

/**
 * Work order data required for SLA breach detection
 */
export interface WorkOrderForSla {
  _id: Types.ObjectId | string;
  workOrderNumber: string;
  title?: string;
  priority: WorkOrderPriority;
  status: string;
  dueAt: Date;
  createdAt: Date;
  orgId: Types.ObjectId | string;
  assignment?: {
    assigneeId?: Types.ObjectId | string;
    assigneeName?: string;
    assigneeEmail?: string;
    vendorId?: Types.ObjectId | string;
  };
  property?: {
    name?: string;
    address?: string;
  };
}

/**
 * Alert recipient information
 */
export interface AlertRecipient {
  email: string;
  name?: string;
  role: "assignee" | "manager" | "supervisor" | "owner";
}

/**
 * SLA breach alert result
 */
export interface SlaBreachAlert {
  workOrderId: string;
  workOrderNumber: string;
  breachLevel: SlaBreachLevel;
  minutesUntilBreach?: number;
  minutesPastBreach?: number;
  alertsSent: {
    email: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * SLA breach scan result
 */
export interface SlaScanResult {
  scannedAt: Date;
  totalScanned: number;
  approaching: number;
  breached: number;
  critical: number;
  alertsSent: number;
  alerts: SlaBreachAlert[];
}

/**
 * Configuration for SLA breach detection
 */
export interface SlaBreachConfig {
  /** Minutes before deadline to send "approaching" alert (default: 60) */
  approachingThresholdMinutes: number;
  /** Hours past deadline to escalate to "critical" (default: 4) */
  criticalThresholdHours: number;
  /** Whether to send emails (default: true) */
  sendEmails: boolean;
  /** Fallback manager emails if assignee not available */
  fallbackManagerEmails?: string[];
  /** Organization name for email branding */
  orgName?: string;
}

const DEFAULT_CONFIG: SlaBreachConfig = {
  approachingThresholdMinutes: 60,
  criticalThresholdHours: 4,
  sendEmails: true,
  fallbackManagerEmails: [],
};

/**
 * Determine the SLA breach level for a work order
 */
export function detectBreachLevel(
  workOrder: WorkOrderForSla,
  config: Partial<SlaBreachConfig> = {}
): { level: SlaBreachLevel | null; minutesUntilBreach?: number; minutesPastBreach?: number } {
  const { approachingThresholdMinutes, criticalThresholdHours } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const now = new Date();
  const dueAt = new Date(workOrder.dueAt);

  // Skip completed/cancelled work orders
  const terminalStatuses = ["COMPLETED", "CLOSED", "CANCELLED", "RESOLVED"];
  if (terminalStatuses.includes(workOrder.status)) {
    return { level: null };
  }

  const minutesRemaining = differenceInMinutes(dueAt, now);
  const hoursPast = differenceInHours(now, dueAt);

  if (minutesRemaining > approachingThresholdMinutes) {
    // Not yet approaching deadline
    return { level: null };
  }

  if (minutesRemaining > 0) {
    // Approaching deadline
    return { level: "approaching", minutesUntilBreach: minutesRemaining };
  }

  if (hoursPast >= criticalThresholdHours) {
    // Critical breach - way past deadline
    return { level: "critical", minutesPastBreach: Math.abs(minutesRemaining) };
  }

  // Standard breach
  return { level: "breached", minutesPastBreach: Math.abs(minutesRemaining) };
}

/**
 * Format minutes into human-readable duration
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"} and ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
}

/**
 * Generate email subject based on breach level
 */
function getEmailSubject(
  workOrder: WorkOrderForSla,
  level: SlaBreachLevel
): string {
  const prefix = {
    approaching: "⚠️ SLA Warning",
    breached: "🔴 SLA Breached",
    critical: "🚨 CRITICAL SLA Breach",
  }[level];

  return `${prefix}: ${workOrder.workOrderNumber} - ${workOrder.title || "Work Order"}`;
}

/**
 * Generate email body based on breach level
 */
function getEmailBody(
  workOrder: WorkOrderForSla,
  level: SlaBreachLevel,
  details: { minutesUntilBreach?: number; minutesPastBreach?: number },
  orgName?: string
): string {
  const propertyInfo = workOrder.property?.name
    ? `Property: ${workOrder.property.name}${workOrder.property.address ? ` (${workOrder.property.address})` : ""}`
    : "";

  const timeInfo =
    level === "approaching"
      ? `Time Remaining: ${formatDuration(details.minutesUntilBreach || 0)}`
      : `Overdue by: ${formatDuration(details.minutesPastBreach || 0)}`;

  const urgency = {
    approaching:
      "This work order is approaching its SLA deadline. Please take action to resolve it before the deadline.",
    breached:
      "This work order has exceeded its SLA deadline. Immediate action is required to minimize customer impact.",
    critical:
      "CRITICAL: This work order has significantly exceeded its SLA deadline. This requires immediate escalation and resolution.",
  }[level];

  return `
SLA Alert for ${orgName || "Fixzit"}

Work Order: ${workOrder.workOrderNumber}
Title: ${workOrder.title || "N/A"}
Priority: ${workOrder.priority}
Status: ${workOrder.status}
${propertyInfo}
${timeInfo}

${urgency}

Assigned To: ${workOrder.assignment?.assigneeName || "Unassigned"}

Please log in to the Fixzit platform to take action on this work order.

---
This is an automated alert from the Fixzit SLA Monitoring System.
`.trim();
}

/**
 * Send SLA breach alert for a work order
 */
async function sendBreachAlert(
  workOrder: WorkOrderForSla,
  level: SlaBreachLevel,
  details: { minutesUntilBreach?: number; minutesPastBreach?: number },
  recipients: AlertRecipient[],
  config: Partial<SlaBreachConfig> = {}
): Promise<SlaBreachAlert> {
  const { sendEmails = true, orgName } = { ...DEFAULT_CONFIG, ...config };

  const alertResult: SlaBreachAlert = {
    workOrderId: String(workOrder._id),
    workOrderNumber: workOrder.workOrderNumber,
    breachLevel: level,
    minutesUntilBreach: details.minutesUntilBreach,
    minutesPastBreach: details.minutesPastBreach,
    alertsSent: [],
  };

  if (!sendEmails) {
    logger.info("[SLA] Email sending disabled, skipping alerts", {
      workOrderNumber: workOrder.workOrderNumber,
      level,
    });
    return alertResult;
  }

  const subject = getEmailSubject(workOrder, level);
  const body = getEmailBody(workOrder, level, details, orgName);

  for (const recipient of recipients) {
    const result = await sendEmail(recipient.email, subject, body);
    alertResult.alertsSent.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      logger.info("[SLA] Alert sent", {
        workOrderNumber: workOrder.workOrderNumber,
        level,
        recipient: recipient.role,
      });
    } else {
      logger.warn("[SLA] Alert failed", {
        workOrderNumber: workOrder.workOrderNumber,
        level,
        recipient: recipient.role,
        error: result.error,
      });
    }
  }

  return alertResult;
}

/**
 * Build recipient list for a work order based on breach level
 */
export function buildRecipientList(
  workOrder: WorkOrderForSla,
  level: SlaBreachLevel,
  managerEmails: string[] = []
): AlertRecipient[] {
  const recipients: AlertRecipient[] = [];

  // Always notify assignee if available
  if (workOrder.assignment?.assigneeEmail) {
    recipients.push({
      email: workOrder.assignment.assigneeEmail,
      name: workOrder.assignment.assigneeName,
      role: "assignee",
    });
  }

  // For breached/critical, also notify managers
  if (level === "breached" || level === "critical") {
    for (const email of managerEmails) {
      recipients.push({
        email,
        role: "manager",
      });
    }
  }

  return recipients;
}

/**
 * Scan work orders for SLA breaches and send alerts
 *
 * @param workOrders - Work orders to scan
 * @param managerEmails - Manager emails to notify for breaches
 * @param config - Optional configuration overrides
 * @returns Scan results with alerts sent
 */
export async function scanForSlaBreaches(
  workOrders: WorkOrderForSla[],
  managerEmails: string[] = [],
  config: Partial<SlaBreachConfig> = {}
): Promise<SlaScanResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const allManagers = [
    ...managerEmails,
    ...(mergedConfig.fallbackManagerEmails || []),
  ];

  const result: SlaScanResult = {
    scannedAt: new Date(),
    totalScanned: workOrders.length,
    approaching: 0,
    breached: 0,
    critical: 0,
    alertsSent: 0,
    alerts: [],
  };

  for (const workOrder of workOrders) {
    const { level, minutesUntilBreach, minutesPastBreach } = detectBreachLevel(
      workOrder,
      mergedConfig
    );

    if (!level) continue;

    // Update counts
    result[level]++;

    // Build recipients
    const recipients = buildRecipientList(workOrder, level, allManagers);

    if (recipients.length === 0) {
      logger.warn("[SLA] No recipients for alert", {
        workOrderNumber: workOrder.workOrderNumber,
        level,
      });
      continue;
    }

    // Send alerts
    const alert = await sendBreachAlert(
      workOrder,
      level,
      { minutesUntilBreach, minutesPastBreach },
      recipients,
      mergedConfig
    );

    result.alerts.push(alert);
    result.alertsSent += alert.alertsSent.filter((a) => a.success).length;
  }

  logger.info("[SLA] Scan complete", {
    totalScanned: result.totalScanned,
    approaching: result.approaching,
    breached: result.breached,
    critical: result.critical,
    alertsSent: result.alertsSent,
  });

  return result;
}

/**
 * Get work orders at risk of SLA breach (for dashboard widgets)
 */
export function filterAtRiskWorkOrders(
  workOrders: WorkOrderForSla[],
  config: Partial<SlaBreachConfig> = {}
): {
  approaching: WorkOrderForSla[];
  breached: WorkOrderForSla[];
  critical: WorkOrderForSla[];
} {
  const approaching: WorkOrderForSla[] = [];
  const breached: WorkOrderForSla[] = [];
  const critical: WorkOrderForSla[] = [];

  for (const workOrder of workOrders) {
    const { level } = detectBreachLevel(workOrder, config);

    switch (level) {
      case "approaching":
        approaching.push(workOrder);
        break;
      case "breached":
        breached.push(workOrder);
        break;
      case "critical":
        critical.push(workOrder);
        break;
    }
  }

  return { approaching, breached, critical };
}

export const SlaBreachService = {
  detectBreachLevel,
  scanForSlaBreaches,
  filterAtRiskWorkOrders,
  buildRecipientList,
};

export default SlaBreachService;
