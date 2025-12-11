import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { Config } from "@/lib/config/constants";
import { NOTIFY } from "@/domain/fm/fm.behavior";
import {
  sendBulkNotifications,
  createChannelMetricsMap,
  type BulkNotificationResult,
  type ChannelMetric,
} from "@/lib/integrations/notifications";
import { emitNotificationTelemetry } from "@/lib/telemetry";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  NotificationDeadLetterModel,
  NotificationLogModel,
} from "@/server/models/NotificationLog";
import {
  recordNotificationMetrics,
  setDeadLetterBacklog,
} from "@/lib/monitoring/notification-metrics";
/**
 * FM Notification Template Engine
 * Generates notifications with deep links for various FM events
 */

export type NotificationChannel = "push" | "email" | "sms" | "whatsapp";

export interface NotificationRecipient {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  preferredChannels: NotificationChannel[];
}

export interface NotificationPayload {
  id: string;
  orgId: string; // SECURITY: Required for tenant isolation
  event: keyof typeof NOTIFY;
  recipients: NotificationRecipient[];
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  priority: "high" | "normal" | "low";
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  status: "pending" | "sent" | "delivered" | "failed" | "partial_failure";
  failureReason?: string;
}

type LoggedRecipient = {
  userId: string;
  preferredChannels: NotificationChannel[];
};

function mapRecipientsForLog(
  recipients: NotificationRecipient[],
): LoggedRecipient[] {
  return recipients.map((recipient) => ({
    userId: recipient.userId,
    preferredChannels: recipient.preferredChannels,
  }));
}

function mapPayloadForLog(notification: NotificationPayload) {
  return {
    title: notification.title,
    body: notification.body,
    data: notification.data,
    deepLink: notification.deepLink,
  };
}

function resolveChannelStatus(
  metric: ChannelMetric,
): "pending" | "sent" | "partial" | "failed" {
  if (metric.failed === 0 && metric.succeeded === 0 && metric.attempted === 0) {
    return "pending";
  }
  if (metric.failed === 0 && metric.succeeded > 0) {
    return "sent";
  }
  if (metric.failed > 0 && metric.succeeded > 0) {
    return "partial";
  }
  return "failed";
}

function createEmptyResult(): BulkNotificationResult {
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    issues: [],
    channelMetrics: createChannelMetricsMap(),
  };
}

async function persistNotificationDraft(
  notification: NotificationPayload,
): Promise<void> {
  try {
    await connectToDatabase();
    await NotificationLogModel.findOneAndUpdate(
      { notificationId: notification.id },
      {
        notificationId: notification.id,
        event: notification.event,
        recipients: mapRecipientsForLog(notification.recipients),
        payload: mapPayloadForLog(notification),
        priority: notification.priority,
        status: notification.status,
        failureReason: notification.failureReason,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        metrics: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
        },
        channelResults: [],
        issues: [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.warn(
      "[Notifications] Unable to write initial notification log entry",
      {
        id: notification.id,
        error,
      },
    );
  }
}

async function persistNotificationOutcome(
  notification: NotificationPayload,
  result: BulkNotificationResult,
): Promise<void> {
  try {
    await connectToDatabase();
    const metrics = result.channelMetrics ?? createChannelMetricsMap();
    const channelResults = Object.values(metrics).map((metric) => ({
      channel: metric.channel,
      status: resolveChannelStatus(metric),
      attempts: metric.attempted,
      succeeded: metric.succeeded,
      failedCount: metric.failed,
      skipped: metric.skipped,
      lastAttemptAt: metric.lastAttemptAt,
      errors: metric.errors,
    }));

    await NotificationLogModel.findOneAndUpdate(
      { notificationId: notification.id },
      {
        notificationId: notification.id,
        event: notification.event,
        recipients: mapRecipientsForLog(notification.recipients),
        payload: mapPayloadForLog(notification),
        priority: notification.priority,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        status: notification.status,
        failureReason: notification.failureReason,
        metrics: {
          attempted: result.attempted,
          succeeded: result.succeeded,
          failed: result.failed,
          skipped: result.skipped,
        },
        channelResults,
        issues: result.issues.map((issue) => ({
          userId: issue.userId,
          channel: issue.channel,
          type: issue.type,
          reason: issue.reason,
          attempt: issue.attempt,
          attemptedAt: issue.attemptedAt,
          metadata: issue.metadata,
        })),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Notifications] Failed to persist notification audit log", {
      id: notification.id,
      error,
    });
  }
}

async function persistNotificationDeadLetters(
  notification: NotificationPayload,
  result: BulkNotificationResult,
): Promise<void> {
  const failedIssues = result.issues.filter((issue) => issue.type === "failed");
  if (failedIssues.length === 0) return;

  try {
    await connectToDatabase();
    const recipientMap = new Map(
      notification.recipients.map((recipient) => [recipient.userId, recipient]),
    );
    const metrics = result.channelMetrics ?? createChannelMetricsMap();

    await NotificationDeadLetterModel.insertMany(
      failedIssues.map((issue) => {
        const recipient = recipientMap.get(issue.userId);
        return {
          notificationId: notification.id,
          event: notification.event,
          channel: issue.channel,
          attempts: issue.attempt ?? metrics[issue.channel]?.attempted ?? 1,
          lastAttemptAt:
            issue.attemptedAt ?? metrics[issue.channel]?.lastAttemptAt,
          error: issue.reason,
          payload: mapPayloadForLog(notification),
          priority: notification.priority,
          recipient: recipient
            ? {
                userId: recipient.userId,
                email: recipient.email,
                phone: recipient.phone,
                preferredChannels: recipient.preferredChannels,
              }
            : undefined,
        };
      }),
      { ordered: false },
    );

    const backlog = await NotificationDeadLetterModel.aggregate<{
      _id: NotificationChannel;
      count: number;
    }>([
      { $match: { status: "pending" } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]);

    const backlogMap = backlog.reduce<
      Partial<Record<NotificationChannel, number>>
    >((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {});
    setDeadLetterBacklog(backlogMap);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Notifications] Failed to enqueue notification DLQ entries", {
      id: notification.id,
      error,
    });
  }
}

/**
 * Generate deep link for FM entities
 */
export function generateDeepLink(
  type:
    | "work-order"
    | "approval"
    | "property"
    | "unit"
    | "tenant"
    | "financial",
  id: string,
  subPath?: string,
): string {
  const scheme = process.env.NEXT_PUBLIC_FIXZIT_DEEP_LINK_SCHEME || "fixzit://";
  const normalizedScheme = scheme.endsWith("://")
    ? scheme
    : `${scheme.replace(/\/+$/, "")}://`;
  const deepLinkMap = {
    "work-order": `${normalizedScheme}fm/work-orders/${id}`,
    approval: `${normalizedScheme}approvals/quote/${id}`,
    property: `${normalizedScheme}fm/properties/${id}`,
    unit: `${normalizedScheme}fm/units/${id}`,
    tenant: `${normalizedScheme}fm/tenants/${id}`,
    financial: `${normalizedScheme}financials/statements/property/${id}`,
  };

  const baseLink = deepLinkMap[type];
  return subPath ? `${baseLink}/${subPath}` : baseLink;
}

function requireContextValue(
  value: string | undefined,
  field: string,
  event: keyof typeof NOTIFY,
): string {
  if (!value) {
    throw new Error(`[Notifications] Missing ${field} for ${event}`);
  }
  return value;
}

/**
 * Build notification from template
 */
export function buildNotification(
  event: keyof typeof NOTIFY,
  context: {
    orgId: string; // SECURITY: Required for tenant isolation
    workOrderId?: string;
    quotationId?: string;
    propertyId?: string;
    tenantName?: string;
    technicianName?: string;
    amount?: number;
    priority?: string;
    description?: string;
  },
  recipients: NotificationRecipient[],
): NotificationPayload {
  // Build notification title and body
  let title = `${Config.company.name} Notification`;
  let body = "";
  let deepLink: string | undefined;
  let priority: "high" | "normal" | "low" = "normal";

  switch (event) {
    case "onTicketCreated": {
      const workOrderId = requireContextValue(
        context.workOrderId,
        "workOrderId",
        event,
      );
      title = "New Work Order Created";
      body = `Work Order #${workOrderId} has been created by ${context.tenantName ?? "customer"}`;
      deepLink = generateDeepLink("work-order", workOrderId);
      priority = "high";
      break;
    }

    case "onAssign": {
      const workOrderId = requireContextValue(
        context.workOrderId,
        "workOrderId",
        event,
      );
      title = "Work Order Assigned";
      body = `You have been assigned to Work Order #${workOrderId}`;
      deepLink = generateDeepLink("work-order", workOrderId);
      priority = "high";
      break;
    }

    case "onApprovalRequested": {
      const quotationId = requireContextValue(
        context.quotationId,
        "quotationId",
        event,
      );
      title = "Approval Required";
      const amountText =
        typeof context.amount === "number"
          ? ` (Amount: SAR ${context.amount.toLocaleString()})`
          : "";
      body = `Quotation #${quotationId} requires your approval${amountText}`;
      deepLink = generateDeepLink("approval", quotationId);
      priority = "high";
      break;
    }

    case "onApproved": {
      const quotationId = requireContextValue(
        context.quotationId,
        "quotationId",
        event,
      );
      title = "Approval Granted";
      body = `Quotation #${quotationId} has been approved`;
      deepLink = generateDeepLink("approval", quotationId);
      priority = "normal";
      break;
    }

    case "onClosed": {
      const workOrderId = requireContextValue(
        context.workOrderId,
        "workOrderId",
        event,
      );
      title = "Work Order Closed";
      body = `Work Order #${workOrderId} has been completed and closed`;
      deepLink = generateDeepLink("work-order", workOrderId);
      priority = "normal";
      break;
    }

    default:
      body = "Notification";
  }

  return {
    id: randomUUID(),
    orgId: context.orgId, // SECURITY: Required for tenant isolation
    event,
    recipients,
    title,
    body,
    deepLink,
    data: context,
    priority,
    createdAt: new Date(),
    status: "pending",
  };
}

/**
 * Send notification to recipients via their preferred channels
 */
export async function sendNotification(
  notification: NotificationPayload,
): Promise<BulkNotificationResult> {
  logger.info("[Notifications] Sending notification", {
    id: notification.id,
    event: notification.event,
    recipientCount: notification.recipients.length,
    title: notification.title,
    deepLink: notification.deepLink,
  });

  const dispatchStartedAt = Date.now();
  await persistNotificationDraft(notification);

  if (notification.recipients.length === 0) {
    notification.status = "failed";
    notification.failureReason = "No recipients provided";
    logger.warn("[Notifications] Skipping sendNotification (no recipients)", {
      id: notification.id,
      event: notification.event,
    });
    const emptyResult = createEmptyResult();
    await persistNotificationOutcome(notification, emptyResult);
    recordNotificationMetrics({
      notification,
      result: emptyResult,
      durationMs: Date.now() - dispatchStartedAt,
    });
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      issues: [],
      channelMetrics: emptyResult.channelMetrics,
    };
  }

  let result: BulkNotificationResult;

  try {
    result = await sendBulkNotifications(notification, notification.recipients);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    notification.status = "failed";
    notification.failureReason =
      error instanceof Error
        ? error.message
        : "Bulk notification dispatch failed";
    notification.sentAt = new Date();
    logger.error("[Notifications] Failed to send notification", {
      id: notification.id,
      error,
    });
    const failureResult = createEmptyResult();
    await persistNotificationOutcome(notification, failureResult);
    recordNotificationMetrics({
      notification,
      result: failureResult,
      durationMs: Date.now() - dispatchStartedAt,
    });
    throw error;
  }

  notification.sentAt = new Date();

  if (result.attempted === 0) {
    notification.status = "failed";
    notification.failureReason = "No valid channels or contact info";
  } else if (result.failed === 0) {
    notification.status = "sent";
  } else if (result.failed === result.attempted) {
    notification.status = "failed";
    notification.failureReason = "All notification attempts failed";
  } else {
    notification.status = "partial_failure";
    notification.failureReason = `${result.failed} of ${result.attempted} channel attempts failed`;
  }

  await persistNotificationOutcome(notification, result);
  await persistNotificationDeadLetters(notification, result);
  recordNotificationMetrics({
    notification,
    result,
    durationMs: Date.now() - dispatchStartedAt,
  });

  if (result.issues.length > 0) {
    logger.warn("[Notifications] Issues encountered while dispatching", {
      id: notification.id,
      issues: result.issues,
    });
  }

  logger.info("[Notifications] Notification dispatch complete", {
    id: notification.id,
    status: notification.status,
    attempted: result.attempted,
    failed: result.failed,
    skipped: result.skipped,
  });

  emitNotificationTelemetry({
    notificationId: notification.id,
    event: notification.event,
    status: notification.status,
    attempted: result.attempted,
    failed: result.failed,
    skipped: result.skipped,
    issues: result.issues,
  }).catch((error) => {
    logger.warn("[Notifications] Telemetry emission failed", {
      id: notification.id,
      error,
    });
  });

  return result;
}

/**
 * Event handlers - wire these to your application events
 */

export async function onTicketCreated(
  orgId: string, // SECURITY: Required for tenant isolation
  workOrderId: string,
  tenantName: string,
  priority: string,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  const notification = buildNotification(
    "onTicketCreated",
    {
      orgId,
      workOrderId,
      tenantName,
      priority,
      description,
    },
    recipients,
  );

  await sendNotification(notification);
}

export async function onAssign(
  orgId: string, // SECURITY: Required for tenant isolation
  workOrderId: string,
  technicianName: string,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  const notification = buildNotification(
    "onAssign",
    {
      orgId,
      workOrderId,
      technicianName,
      description,
    },
    recipients,
  );

  await sendNotification(notification);
}

export async function onApprovalRequested(
  orgId: string, // SECURITY: Required for tenant isolation
  quotationId: string,
  amount: number,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  const notification = buildNotification(
    "onApprovalRequested",
    {
      orgId,
      quotationId,
      amount,
      description,
    },
    recipients,
  );

  await sendNotification(notification);
}

export async function onClosed(
  orgId: string, // SECURITY: Required for tenant isolation
  workOrderId: string,
  propertyId: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  const notification = buildNotification(
    "onClosed",
    {
      orgId,
      workOrderId,
      propertyId,
    },
    recipients,
  );

  await sendNotification(notification);
}
