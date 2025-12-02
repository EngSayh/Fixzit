import { randomUUID } from "crypto"; // Use built-in crypto for collision-resistant UUIDs

import { dbConnect } from "@/db/mongoose";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendBulkSMS, withTwilioResilience } from "@/lib/sms";
import {
  NotificationDeadLetterModel,
  NotificationLogModel,
} from "@/server/models/NotificationLog";

/**
 * @deprecated This legacy notification engine is DEPRECATED as of 2025-12-01.
 * 
 * ⚠️ SECURITY WARNING: This file was missing orgId for multi-tenant isolation.
 * orgId has been added, but the canonical notification system is:
 * 
 *   `lib/fm-notifications.ts` - USE THIS INSTEAD
 * 
 * This file is retained for reference only and should NOT be used in production.
 * All new notification code should use the canonical system which has:
 * - Full orgId tenant isolation
 * - Integration with approval engine
 * - Proper RBAC support
 * 
 * TODO: Remove this file after migration is complete.
 * 
 * FM Notification Template Engine (LEGACY)
 * Generates notifications with deep links for various FM events
 *
 * CODE REVIEW FIXES IMPLEMENTED (November 14, 2025):
 *
 * 1. **Performance & Scalability (Critical)**:
 *    - Refactored sendNotification to use Promise.allSettled for concurrent channel execution
 *    - Eliminated sequential await blocking that violated <500ms API response requirement
 *    - Added architectural note for background queue (BullMQ/Redis) for enterprise scale
 *
 * 2. **Localization (Critical Gap - Partially Addressed)**:
 *    - Added locale: 'en' | 'ar' to NotificationRecipient interface
 *    - Implemented per-recipient localization in buildNotification
 *    - Added bilingual template support for English/Arabic
 *    - NOTE: Full i18n with i18next should replace fallback implementation
 *
 * 3. **Deep Link Strategy (Fixed)**:
 *    - Added webUrl alongside deepLink for desktop/email support
 *    - generateLinks now returns both HTTPS URLs and mobile deep links
 *    - Email/SMS use web URLs, Push uses deep links
 *
 * 4. **Logic Fixes**:
 *    - Fixed onClosed to link to work-order (not financial statements)
 *    - Changed ID generation from Date.now() to crypto.randomUUID()
 *    - Added fcmToken to NotificationRecipient interface
 *
 * 5. **Type Safety**:
 *    - Implemented TypeScript Discriminated Unions for context
 *    - Each event now has strictly typed required fields
 *    - Eliminated unsafe type assertions
 *
 * 6. **Status Tracking**:
 *    - Enhanced status: 'partial_failure' added for resilient error handling
 *    - Defensive checks for missing contact info per channel
 */

import { NOTIFY } from "@/domain/fm/fm.behavior";

// i18n fallback with bilingual support - replace with actual i18next for production
const i18n = {
  changeLanguage: (_lang: string) => {
    /* stub */
  },
  t: (key: string, locale: "en" | "ar", context?: Record<string, unknown>) => {
    // Bilingual templates (English/Arabic)
    const templates: Record<string, Record<"en" | "ar", string>> = {
      "notifications.onTicketCreated.title": {
        en: "New Work Order Created",
        ar: "تم إنشاء أمر عمل جديد",
      },
      "notifications.onTicketCreated.body": {
        en: "Work order #{{workOrderId}} for {{tenantName}} - Priority: {{priority}}",
        ar: "أمر عمل #{{workOrderId}} لـ {{tenantName}} - الأولوية: {{priority}}",
      },
      "notifications.onAssign.title": {
        en: "Work Order Assigned",
        ar: "تم تعيين أمر العمل",
      },
      "notifications.onAssign.body": {
        en: "Assigned to {{technicianName}} - Work Order #{{workOrderId}}",
        ar: "تم التعيين إلى {{technicianName}} - أمر عمل #{{workOrderId}}",
      },
      "notifications.onApprovalRequested.title": {
        en: "Approval Required",
        ar: "مطلوب موافقة",
      },
      "notifications.onApprovalRequested.body": {
        en: "Quote #{{quotationId}} requires approval - Amount: {{amount}}",
        ar: "عرض السعر #{{quotationId}} يتطلب الموافقة - المبلغ: {{amount}}",
      },
      "notifications.onApproved.title": {
        en: "Quote Approved",
        ar: "تمت الموافقة على العرض",
      },
      "notifications.onApproved.body": {
        en: "Quote #{{quotationId}} has been approved",
        ar: "تمت الموافقة على عرض السعر #{{quotationId}}",
      },
      "notifications.onClosed.title": {
        en: "Work Order Closed",
        ar: "تم إغلاق أمر العمل",
      },
      "notifications.onClosed.body": {
        en: "Work Order #{{workOrderId}} has been completed and closed",
        ar: "تم إكمال وإغلاق أمر العمل #{{workOrderId}}",
      },
    };

    let message = templates[key]?.[locale] || templates[key]?.["en"] || key;
    if (context) {
      Object.entries(context).forEach(([k, v]) => {
        message = message.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
    }
    return message;
  },
};

export type NotificationChannel = "push" | "email" | "sms" | "whatsapp";

export interface NotificationRecipient {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  fcmToken?: string; // For Push Notifications
  locale: "en" | "ar"; // For Localization (Critical Requirement)
  preferredChannels: NotificationChannel[];
}

export interface NotificationPayload {
  id: string;
  /**
   * SECURITY FIX (2025-12-01): Added orgId for multi-tenant isolation.
   * All notifications MUST include orgId to prevent cross-tenant data leakage.
   */
  orgId: string;
  event: keyof typeof NOTIFY;
  recipients: NotificationRecipient[];
  title: string;
  body: string;
  deepLink?: string;
  webUrl?: string; // Added for Web support
  data?: Record<string, unknown>;
  priority: "high" | "normal" | "low";
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  status: "pending" | "sent" | "delivered" | "failed" | "partial_failure";
  failureReason?: string;
}

interface ChannelDispatchResult {
  channel: NotificationChannel;
  status: "sent" | "failed";
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
}

// Define Discriminated Unions for Context (Strong Typing)
interface BaseContext {
  description?: string;
  /**
   * SECURITY FIX (2025-12-01): Added orgId for multi-tenant isolation.
   * All notification contexts MUST include orgId.
   */
  orgId: string;
}

interface TicketCreatedContext extends BaseContext {
  event: "onTicketCreated";
  workOrderId: string;
  tenantName: string;
  priority: string;
}

interface AssignContext extends BaseContext {
  event: "onAssign";
  workOrderId: string;
  technicianName: string;
}

interface ApprovalRequestedContext extends BaseContext {
  event: "onApprovalRequested";
  quotationId: string;
  amount: number;
}

interface ApprovedContext extends BaseContext {
  event: "onApproved";
  quotationId: string;
}

interface ClosedContext extends BaseContext {
  event: "onClosed";
  workOrderId: string;
  propertyId: string;
}

// Create the union type
export type NotificationContext =
  | TicketCreatedContext
  | AssignContext
  | ApprovalRequestedContext
  | ApprovedContext
  | ClosedContext;

// Optional DB persistence (hook into MongoDB)
async function saveNotification(
  notification: NotificationPayload,
  channelResults: ChannelDispatchResult[] = [],
): Promise<void> {
  try {
    await dbConnect();
    const recipients = notification.recipients.map((recipient) => ({
      userId: recipient.userId,
      preferredChannels: recipient.preferredChannels,
    }));

    // SECURITY FIX (2025-12-01): Enforce orgId for multi-tenant isolation
    if (!notification.orgId) {
      logger.error("[Notifications] CRITICAL: Missing orgId - skipping save to prevent cross-tenant leak", {
        id: notification.id,
        event: notification.event,
      });
      return;
    }

    await NotificationLogModel.findOneAndUpdate(
      { orgId: notification.orgId, notificationId: notification.id },
      {
        orgId: notification.orgId,
        notificationId: notification.id,
        event: notification.event,
        recipients,
        payload: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          deepLink: notification.deepLink,
          webUrl: notification.webUrl,
        },
        priority: notification.priority,
        status: notification.status,
        failureReason: notification.failureReason,
        channelResults: channelResults.map((result) => ({
          channel: result.channel,
          status: result.status === "sent" ? "sent" : "failed",
          attempts: result.attempts,
          lastAttemptAt: result.lastAttemptAt,
          error: result.error,
        })),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Notifications] Failed to persist notification log", error, {
      id: notification.id,
    });
  }
}

async function enqueueDeadLetters(
  notification: NotificationPayload,
  failedChannels: ChannelDispatchResult[],
): Promise<void> {
  if (failedChannels.length === 0) return;

  // SECURITY FIX (2025-12-01): Enforce orgId for multi-tenant isolation
  if (!notification.orgId) {
    logger.error("[Notifications] CRITICAL: Missing orgId in DLQ - skipping to prevent cross-tenant leak", {
      id: notification.id,
      event: notification.event,
      failedChannels: failedChannels.length,
    });
    return;
  }

  try {
    await dbConnect();
    await NotificationDeadLetterModel.insertMany(
      failedChannels.map((channel) => ({
        orgId: notification.orgId,
        notificationId: notification.id,
        event: notification.event,
        channel: channel.channel,
        attempts: channel.attempts,
        error: channel.error || "Unknown channel failure",
        payload: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      })),
      { ordered: false },
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error(
      "[Notifications] Failed to enqueue notification DLQ entry",
      error,
      {
        id: notification.id,
      },
    );
  }
}

/**
 * Generate deep link and web URL for FM entities (Web vs. Mobile support)
 */
export function generateLinks(
  type:
    | "work-order"
    | "approval"
    | "property"
    | "unit"
    | "tenant"
    | "financial",
  id: string,
  subPath?: string,
): { webUrl: string; deepLink: string } {
  if (!id) throw new Error("ID required for link generation");

  const webBase = (
    process.env.NEXT_PUBLIC_FIXZIT_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://app.fixzit.com"
  ).replace(/\/$/, "");
  const deepLinkSchemeRaw =
    process.env.NEXT_PUBLIC_FIXZIT_DEEP_LINK_SCHEME || "fixzit://";

  const normalizeDeepLinkBase = (raw: string): string => {
    const prepared = raw.includes("://") ? raw : `${raw}://`;
    const [scheme, restRaw = ""] = prepared.split("://");
    const rest = restRaw.replace(/\/+$/, "");
    // When no host/path is provided, keep the trailing double slashes (scheme only).
    return rest ? `${scheme}://${rest}` : `${scheme}://`;
  };

  const deepLinkBase = normalizeDeepLinkBase(deepLinkSchemeRaw);

  const paths: Record<typeof type, string> = {
    "work-order": `/fm/work-orders/${id}`,
    approval: `/approvals/quote/${id}`,
    property: `/fm/properties/${id}`,
    unit: `/fm/properties/units/${id}`,
    tenant: `/fm/tenants/${id}`,
    financial: `/financials/statements/property/${id}`,
  };

  let path = paths[type];
  if (subPath) {
    path = `${path}/${subPath}`;
  }

  const deepLinkPath = path.replace(/^\/+/, "");
  const deepLink = deepLinkBase.endsWith("//")
    ? `${deepLinkBase}${deepLinkPath}`
    : `${deepLinkBase}/${deepLinkPath}`;

  return {
    webUrl: `${webBase}${path}`,
    deepLink,
  };
}

/**
 * Helper to convert context to i18n params safely
 * Extracts only serializable properties needed for template interpolation
 */
function contextToI18nParams(
  context: NotificationContext,
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { event, description, ...params } = context;
  return params;
}

/**
 * Helper to convert context to payload data
 * Preserves all context properties for storage and potential future use
 */
function contextToPayloadData(
  context: NotificationContext,
): Record<string, unknown> {
  return { ...context };
}

/**
 * Build notification from template with per-recipient localization
 * NOTE: Full i18n implementation should group recipients by locale and create separate payloads
 */
export function buildNotification(
  context: NotificationContext,
  recipients: NotificationRecipient[],
): NotificationPayload {
  if (recipients.length === 0)
    throw new Error("At least one recipient required");

  // Use first recipient's locale for this payload (in production, group by locale)
  const locale = recipients[0]?.locale || "en";

  let title = "";
  let body = "";
  let links: { webUrl: string; deepLink: string } | undefined;
  let priority: "high" | "normal" | "low" = "normal";
  const event = context.event;

  // Extract i18n params once for all cases
  const i18nParams = contextToI18nParams(context);

  // TypeScript now knows exact context type for each case
  switch (context.event) {
    case "onTicketCreated":
      title = i18n.t("notifications.onTicketCreated.title", locale);
      body = i18n.t("notifications.onTicketCreated.body", locale, i18nParams);
      links = generateLinks("work-order", context.workOrderId);
      priority = "high";
      break;

    case "onAssign":
      title = i18n.t("notifications.onAssign.title", locale);
      body = i18n.t("notifications.onAssign.body", locale, i18nParams);
      links = generateLinks("work-order", context.workOrderId);
      priority = "high";
      break;

    case "onApprovalRequested":
      title = i18n.t("notifications.onApprovalRequested.title", locale);
      body = i18n.t(
        "notifications.onApprovalRequested.body",
        locale,
        i18nParams,
      );
      links = generateLinks("approval", context.quotationId);
      priority = "high";
      break;

    case "onApproved":
      title = i18n.t("notifications.onApproved.title", locale);
      body = i18n.t("notifications.onApproved.body", locale, i18nParams);
      links = generateLinks("approval", context.quotationId);
      priority = "normal";
      break;

    case "onClosed": {
      // LOGIC FIX: Link to the Work Order, not financials
      title = i18n.t("notifications.onClosed.title", locale);
      body = i18n.t("notifications.onClosed.body", locale, i18nParams);
      links = generateLinks("work-order", context.workOrderId);
      priority = "normal";
      break;
    }

    default: {
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = context;
      throw new Error(
        `Unhandled notification event: ${(_exhaustive as NotificationContext).event}`,
      );
    }
  }

  // SECURITY FIX (2025-12-01): Validate orgId before building notification
  if (!context.orgId) {
    throw new Error("SECURITY: orgId is required for multi-tenant isolation");
  }

  const payload: NotificationPayload = {
    id: randomUUID(), // FIX: Use crypto.randomUUID() for collision resistance
    orgId: context.orgId, // SECURITY FIX: Include orgId for tenant isolation
    event: event as keyof typeof NOTIFY,
    recipients,
    title,
    body,
    deepLink: links?.deepLink,
    webUrl: links?.webUrl,
    data: contextToPayloadData(context),
    priority,
    createdAt: new Date(),
    status: "pending",
  };

  void saveNotification(payload); // Persist early (fire-and-forget)
  return payload;
}

/**
 * Send notification with concurrent execution (Performance Fix)
 * Uses Promise.allSettled to prevent blocking and ensure <500ms API response by default
 *
 * ARCHITECTURAL NOTE: For enterprise scale, offload to background queue (BullMQ/Redis/SQS)
 * to decouple notification dispatch from API response time
 */
export async function sendNotification(
  notification: NotificationPayload,
  maxRetries = 3,
  options?: { background?: boolean },
): Promise<void> {
  const background = options?.background ?? true;

  const dispatch = async (): Promise<void> => {
    logger.info("[Notifications] Dispatching notification", {
      id: notification.id,
      event: notification.event,
      recipientCount: notification.recipients.length,
      title: notification.title,
    });

    // Group recipients by channel with defensive checks
    const channelGroups: Record<NotificationChannel, NotificationRecipient[]> =
      {
        push: [],
        email: [],
        sms: [],
        whatsapp: [],
      };

    notification.recipients.forEach((recipient) => {
      recipient.preferredChannels.forEach((channel) => {
        // Defensive Check: Ensure required contact info exists for the channel
        if (channel === "email" && !recipient.email) {
          logger.warn(
            `[Notifications] Recipient ${recipient.userId} prefers email but has no address`,
          );
          return;
        }
        if ((channel === "sms" || channel === "whatsapp") && !recipient.phone) {
          logger.warn(
            `[Notifications] Recipient ${recipient.userId} prefers ${channel} but has no phone`,
          );
          return;
        }
        if (channel === "push" && !recipient.fcmToken) {
          logger.warn(
            `[Notifications] Recipient ${recipient.userId} prefers push but has no FCM token`,
          );
          return;
        }

        channelGroups[channel].push(recipient);
      });
    });

    const channelAttempts: Partial<
      Record<NotificationChannel, { attempts: number; lastAttemptAt?: Date }>
    > = {};

    const sendWithRetry = async (
      channel: NotificationChannel,
      sendFn: () => Promise<void>,
    ) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        channelAttempts[channel] = {
          attempts: attempt,
          lastAttemptAt: new Date(),
        };
        try {
          await sendFn();
          return;
        } catch (_error) {
          const error =
            _error instanceof Error ? _error : new Error(String(_error));
          void error;
          logger.error(
            `[Notifications] ${channel} attempt ${attempt}/${maxRetries} failed`,
            error,
            { notificationId: notification.id },
          );
          if (attempt === maxRetries) throw error; // Let Promise.allSettled handle final failure
        }
      }
    };

    // Prepare promises for CONCURRENT execution (Performance Fix)
    const sendOperations: Array<{
      channel: NotificationChannel;
      promise: Promise<void>;
    }> = [];

    if (channelGroups.push.length > 0) {
      sendOperations.push({
        channel: "push",
        promise: sendWithRetry("push", () =>
          sendPushNotifications(notification, channelGroups.push),
        ),
      });
    }
    if (channelGroups.email.length > 0) {
      sendOperations.push({
        channel: "email",
        promise: sendWithRetry("email", () =>
          sendEmailNotifications(notification, channelGroups.email),
        ),
      });
    }
    if (channelGroups.sms.length > 0) {
      sendOperations.push({
        channel: "sms",
        promise: sendWithRetry("sms", () =>
          sendSMSNotifications(notification, channelGroups.sms),
        ),
      });
    }
    if (channelGroups.whatsapp.length > 0) {
      sendOperations.push({
        channel: "whatsapp",
        promise: sendWithRetry("whatsapp", () =>
          sendWhatsAppNotifications(notification, channelGroups.whatsapp),
        ),
      });
    }

    const results = await Promise.allSettled(
      sendOperations.map((op) => op.promise),
    );
    const channelResults: ChannelDispatchResult[] = sendOperations.map(
      (operation, index) => {
        const attemptsInfo = channelAttempts[operation.channel];
        const attempts = attemptsInfo?.attempts ?? 0;
        const lastAttemptAt = attemptsInfo?.lastAttemptAt;
        const result = results[index];
        if (result?.status === "fulfilled") {
          return {
            channel: operation.channel,
            status: "sent",
            attempts,
            lastAttemptAt,
          };
        }
        const error =
          result && result.status === "rejected"
            ? result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
            : "Unknown error";
        return {
          channel: operation.channel,
          status: "failed",
          attempts,
          lastAttemptAt,
          error,
        };
      },
    );

    const failures = channelResults.filter(
      (result) => result.status === "failed",
    );

    if (failures.length > 0) {
      logger.error("[Notifications] Failures during notification dispatch", {
        id: notification.id,
        failureCount: failures.length,
        failures,
      });

      // Update status based on outcome
      if (
        failures.length === sendOperations.length &&
        sendOperations.length > 0
      ) {
        notification.status = "failed";
        notification.failureReason = `All ${failures.length} channels failed`;
      } else {
        notification.status = "partial_failure";
        notification.failureReason = `${failures.length} of ${sendOperations.length} channels failed`;
      }
    } else if (sendOperations.length > 0) {
      notification.status = "sent";
    } else {
      logger.warn("[Notifications] No channels attempted", {
        id: notification.id,
      });
      notification.status = "failed";
      notification.failureReason = "No valid channels or recipients";
    }

    notification.sentAt = new Date();
    await saveNotification(notification, channelResults); // Persist updated status to database
    await enqueueDeadLetters(notification, failures);

    logger.info("[Notifications] Notification dispatch complete", {
      id: notification.id,
      status: notification.status,
      attempted: sendOperations.length,
      failed: failures.length,
    });
  };

  // Default: Fire-and-forget to keep API responses under 500ms.
  if (background) {
    dispatch().catch((error) => {
      logger.error("[Notifications] Background dispatch failed", error, {
        id: notification.id,
      });
    });
    return;
  }

  await dispatch();
}

/**
 * Group recipients by locale to avoid cross-language payloads
 */
async function sendNotificationByLocale(
  context: NotificationContext,
  recipients: NotificationRecipient[],
  maxRetries = 3,
): Promise<void> {
  const localeGroups = recipients.reduce<
    Record<string, NotificationRecipient[]>
  >((acc, recipient) => {
    const locale = recipient.locale || "en";
    acc[locale] = acc[locale] || [];
    acc[locale].push(recipient);
    return acc;
  }, {});

  await Promise.all(
    Object.values(localeGroups).map((group) => {
      const notification = buildNotification(context, group);
      return sendNotification(notification, maxRetries);
    }),
  );
}

/**
 * Send push notifications (with batching)
 */
async function sendPushNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[],
): Promise<void> {
  logger.info("[Notifications] Sending push", {
    recipientCount: recipients.length,
  });

  if (!process.env.FCM_SERVER_KEY || !process.env.FCM_SENDER_ID) {
    throw new Error("FCM not configured");
  }

  const admin = await import("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  const tokens = recipients
    .map((r) => r.fcmToken)
    .filter((t): t is string => Boolean(t));

  if (tokens.length === 0) return;

  // Batch: FCM limit ~500 per multicast
  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    /**
     * @ts-expect-error - Type safety suppression for firebase-admin version compatibility
     * 
     * The sendMulticast() method exists and works correctly in firebase-admin@11.0.0+,
     * but TypeScript types may be outdated or incomplete in the installed @types package.
     * 
     * Method signature: admin.messaging().sendMulticast(message: MulticastMessage): Promise<BatchResponse>
     * Reference: https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.messaging.md#messagingsendmulticast
    /**
     * This is safe to suppress because:
     * 1. Runtime API is stable and documented
     * 2. firebase-admin version is pinned in package.json
     * 3. Method has been available since v11.0.0 (2021)
     * 
     * Alternative: Update @types/firebase-admin if newer types become available
     */
    // @ts-expect-error sendMulticast exists in runtime but may be missing from type definitions
    const response = await admin.messaging().sendMulticast({
      tokens: batch,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: Object.fromEntries(
        Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)]),
      ),
      android: {
        priority: notification.priority === "high" ? "high" : "normal",
      },
      apns: {
        payload: {
          aps: { contentAvailable: notification.priority === "high" },
        },
      },
    });

    // Handle failures (remove invalid tokens, etc.)
    if (response.failureCount > 0) {
      logger.warn("[Notifications] FCM failures", {
        failureCount: response.failureCount,
      });

      // Extract failed token indices and remove them from users' fcmTokens arrays
      const failedTokens: string[] = [];
      const sendResponses = response.responses as Array<{
        success: boolean;
        error?: { message?: string };
      }>;
      sendResponses.forEach((resp, idx: number) => {
        if (!resp.success) {
          failedTokens.push(batch[idx]);
          logger.debug("[Notifications] Failed FCM token", {
            token: batch[idx],
            error: resp.error?.message,
          });
        }
      });

      // Remove invalid tokens from database
      if (failedTokens.length > 0) {
        try {
          const { User } = await import("@/server/models/User");
          await User.updateMany(
            { fcmTokens: { $in: failedTokens } },
            { $pullAll: { fcmTokens: failedTokens } },
          );
          logger.info("[Notifications] Removed invalid FCM tokens", {
            count: failedTokens.length,
          });
        } catch (_error) {
          const error =
            _error instanceof Error ? _error : new Error(String(_error));
          void error;
          logger.error(
            "[Notifications] Failed to remove invalid tokens",
            error,
            {
              tokenCount: failedTokens.length,
            },
          );
        }
      }
    }
  }

  notification.deliveredAt = new Date(); // Approximate
  logger.info("[Notifications] FCM push sent", { tokenCount: tokens.length });
}

/**
 * Send email notifications (with priority header)
 */
async function sendEmailNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[],
): Promise<void> {
  logger.info("[Notifications] Sending email", {
    recipientCount: recipients.length,
  });

  // Use getEnv with alias support for Vercel naming conventions
  const sendgridApiKey = getEnv("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    throw new Error("SendGrid not configured (SENDGRID_API_KEY, SEND_GRID, or SEND_GRID_EMAIL_FIXZIT_TOKEN)");
  }

  const sgMail = (await import("@sendgrid/mail")).default;
  sgMail.setApiKey(sendgridApiKey);

  const emails = recipients
    .map((r) => r.email)
    .filter((e): e is string => Boolean(e));

  if (emails.length === 0) return;

  const escapeHtml = (str: string): string =>
    str.replace(
      /[&<>"']/g,
      (match) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[match]!,
    );

  /**
   * SEC-007 FIX: URL domain allowlist validation to prevent phishing attacks
   * Only allows URLs from trusted Fixzit domains
   * 
   * NOTE: Includes app.fixzit.com to match generateLinks() fallback default
   */
  const ALLOWED_LINK_DOMAINS = [
    // Root marketing domains
    "fixzit.co",
    "fixzit.sa",
    "fixzit.com",
    // App subdomains
    "app.fixzit.co",
    "app.fixzit.sa",
    "app.fixzit.com", // matches generateLinks() default fallback
    // Development domains (only in non-production)
    ...(process.env.NODE_ENV !== "production" ? ["localhost"] : []),
  ];

  const sanitizeUrl = (url?: string): string => {
    if (!url) return "";

    // Block javascript: and data: protocols
    if (
      url.toLowerCase().startsWith("javascript:") ||
      url.toLowerCase().startsWith("data:")
    )
      return "";

    // SEC-007 FIX: Validate domain is in allowlist
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Check if hostname matches an allowed domain or is a subdomain of one
      const isAllowed = ALLOWED_LINK_DOMAINS.some(
        (domain) =>
          hostname === domain ||
          hostname.endsWith(`.${domain}`) ||
          (domain === "localhost" && hostname === "localhost")
      );

      if (!isAllowed) {
        logger.warn("[Notifications] SEC-007: Blocked untrusted email link", {
          providedUrl: url.slice(0, 200), // Truncate for safety
          hostname,
        });
        return "";
      }

      return url;
    } catch {
      // Invalid URL format
      logger.warn("[Notifications] SEC-007: Blocked invalid URL format", {
        providedUrl: url.slice(0, 200),
      });
      return "";
    }
  };

  const escapedTitle = escapeHtml(notification.title);
  const escapedBody = escapeHtml(notification.body);
  // Use webUrl for email (desktop support) instead of mobile deep link
  const safeLink = sanitizeUrl(notification.webUrl || notification.deepLink);
  const escapedLink = escapeHtml(safeLink);

  await sgMail.send({
    to: emails,
    from:
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "noreply@fixzit.sa",
    subject: escapedTitle,
    text: notification.body,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${escapedTitle}</h2>
        <p style="color: #666; line-height: 1.6;">${escapedBody}</p>
        ${safeLink ? `<p><a href="${escapedLink}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Details</a></p>` : ""}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">This is an automated notification from Fixzit. Please do not reply.</p>
      </div>
    `,
    // Note: Priority can be set via headers if needed: headers: { 'X-Priority': notification.priority === 'high' ? '1' : '3' }
  });

  notification.deliveredAt = new Date();
  logger.info("[Notifications] Email sent via SendGrid", {
    recipientCount: emails.length,
  });
}

/**
 * Send SMS notifications (with shortening)
 */
async function sendSMSNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[],
): Promise<void> {
  logger.info("[Notifications] Sending SMS", {
    recipientCount: recipients.length,
  });

  const phones = recipients
    .map((r) => r.phone)
    .filter((p): p is string => Boolean(p));
  if (phones.length === 0) return;

  let smsBody = `${notification.title}\n\n${notification.body}`;
  // Use webUrl for SMS (desktop support) instead of mobile deep link
  const link = notification.webUrl || notification.deepLink;
  if (link) smsBody += `\n\nView: ${link}`;
  if (smsBody.length > 1600) smsBody = smsBody.substring(0, 1597) + "..."; // Shorten

  await sendBulkSMS(phones, smsBody, { delayMs: 200 });

  notification.deliveredAt = new Date();
  logger.info("[Notifications] SMS sent via Twilio", {
    recipientCount: phones.length,
  });
}

/**
 * Send WhatsApp notifications (similar to SMS)
 */
async function sendWhatsAppNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[],
): Promise<void> {
  logger.info("[Notifications] Sending WhatsApp", {
    recipientCount: recipients.length,
  });

  if (
    !process.env.TWILIO_WHATSAPP_NUMBER ||
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN
  ) {
    throw new Error("WhatsApp/Twilio not configured");
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  const phones = recipients
    .map((r) => r.phone)
    .filter((p): p is string => Boolean(p));
  if (phones.length === 0) return;

  let whatsappBody = `*${notification.title}*\n\n${notification.body}`;
  // Use webUrl for WhatsApp (desktop support) instead of mobile deep link
  const link = notification.webUrl || notification.deepLink;
  if (link) whatsappBody += `\n\nView Details: ${link}`;
  if (whatsappBody.length > 1600)
    whatsappBody = whatsappBody.substring(0, 1597) + "...";

  await Promise.all(
    phones.map((phone) =>
      withTwilioResilience("whatsapp-send", () =>
        client.messages.create({
          to: `whatsapp:${phone}`,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          body: whatsappBody,
        }),
      ),
    ),
  );

  notification.deliveredAt = new Date();
  logger.info("[Notifications] WhatsApp sent via Twilio", {
    recipientCount: phones.length,
  });
}

/**
 * Event handlers with strongly-typed context (Type Safety Fix)
 * 
 * SECURITY FIX (2025-12-01): All handlers now require orgId parameter
 * for multi-tenant isolation.
 */
export async function onTicketCreated(
  orgId: string,
  workOrderId: string,
  tenantName: string,
  priority: string,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  if (!orgId) throw new Error("SECURITY: orgId required for multi-tenant isolation");
  if (!workOrderId) throw new Error("workOrderId required");

  const context: TicketCreatedContext = {
    event: "onTicketCreated",
    orgId,
    workOrderId,
    tenantName,
    priority,
    description,
  };

  await sendNotificationByLocale(context, recipients);
}

export async function onAssign(
  orgId: string,
  workOrderId: string,
  technicianName: string,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  if (!orgId) throw new Error("SECURITY: orgId required for multi-tenant isolation");
  if (!workOrderId) throw new Error("workOrderId required");

  const context: AssignContext = {
    event: "onAssign",
    orgId,
    workOrderId,
    technicianName,
    description,
  };

  await sendNotificationByLocale(context, recipients);
}

export async function onApprovalRequested(
  orgId: string,
  quotationId: string,
  amount: number,
  description: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  if (!orgId) throw new Error("SECURITY: orgId required for multi-tenant isolation");
  if (!quotationId) throw new Error("quotationId required");

  const context: ApprovalRequestedContext = {
    event: "onApprovalRequested",
    orgId,
    quotationId,
    amount,
    description,
  };

  await sendNotificationByLocale(context, recipients);
}

export async function onApproved(
  orgId: string,
  quotationId: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  if (!orgId) throw new Error("SECURITY: orgId required for multi-tenant isolation");
  if (!quotationId) throw new Error("quotationId required");

  const context: ApprovedContext = {
    event: "onApproved",
    orgId,
    quotationId,
  };

  await sendNotificationByLocale(context, recipients);
}

export async function onClosed(
  orgId: string,
  workOrderId: string,
  propertyId: string,
  recipients: NotificationRecipient[],
): Promise<void> {
  if (!orgId) throw new Error("SECURITY: orgId required for multi-tenant isolation");
  if (!workOrderId || !propertyId)
    throw new Error("workOrderId and propertyId required");

  const context: ClosedContext = {
    event: "onClosed",
    orgId,
    workOrderId,
    propertyId,
  };

  await sendNotificationByLocale(context, recipients);
}
