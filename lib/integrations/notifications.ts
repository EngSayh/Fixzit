import axios from "axios";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationRecipient,
} from "@/lib/fm-notifications";
import type { messaging } from "firebase-admin";

// Dynamic imports for heavy packages to reduce TypeScript server memory usage
// - firebase-admin: 51 type definition files
// - twilio: 678 type definition files (biggest contributor to TS server OOM)
// - @sendgrid/mail: ~20 type definition files
type FirebaseAdmin = typeof import("firebase-admin");
type SendGridMail = typeof import("@sendgrid/mail");

async function resolveModuleDefault<T>(
  importPromise: Promise<unknown>,
): Promise<T> {
  const loadedModule = (await importPromise) as { default?: T };
  if (
    loadedModule &&
    typeof loadedModule === "object" &&
    "default" in loadedModule &&
    loadedModule.default
  ) {
    return loadedModule.default;
  }
  return loadedModule as unknown as T;
}

/**
 * External Notification Service Integrations
 * Implements SendGrid, Twilio, WhatsApp Business API, and Firebase Cloud Messaging
 */

export interface BulkNotificationIssue {
  userId: string;
  channel: NotificationChannel;
  type: "failed" | "skipped";
  reason: string;
  attempt?: number;
  attemptedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ChannelMetric {
  channel: NotificationChannel;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  lastAttemptAt?: Date;
  errors: string[];
}

export type ChannelMetricsMap = Record<NotificationChannel, ChannelMetric>;

export interface BulkNotificationResult {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  issues: BulkNotificationIssue[];
  channelMetrics: ChannelMetricsMap;
}

export function createChannelMetricsMap(): ChannelMetricsMap {
  const channels: NotificationChannel[] = ["push", "email", "sms", "whatsapp"];
  return channels.reduce<ChannelMetricsMap>((acc, channel) => {
    acc[channel] = {
      channel,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
    return acc;
  }, {} as ChannelMetricsMap);
}

// =============================================================================
// Firebase Cloud Messaging (FCM) - Push Notifications
// =============================================================================

let fcmInitialized = false;
let adminInstance: FirebaseAdmin | null = null;

async function initializeFCM() {
  if (fcmInitialized) return adminInstance!;

  try {
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      logger.warn("[FCM] Firebase credentials not configured");
      throw new Error("FCM not configured");
    }

    const admin = await resolveModuleDefault<FirebaseAdmin>(
      import("firebase-admin"),
    );
    adminInstance = admin;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      }),
    });

    fcmInitialized = true;
    logger.info("[FCM] Initialized successfully");
    return admin;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FCM] Initialization failed", { error });
    throw error;
  }
}

export async function sendFCMNotification(
  userId: string,
  notification: NotificationPayload,
): Promise<void> {
  try {
    const admin = await initializeFCM();

    if (!fcmInitialized || !adminInstance) {
      const error = new Error("FCM not configured");
      logger.warn("[FCM] Skipping push notification (not initialized)");
      throw error;
    }

    // Get user's FCM tokens from database
    const tokens = await getUserFCMTokens(userId);
    if (tokens.length === 0) {
      logger.info("[FCM] No tokens found for user", { userId });
      return;
    }

    // Build FCM message
    const message: messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notificationId: notification.id,
        event: notification.event,
        deepLink: notification.deepLink || "",
        ...Object.fromEntries(
          Object.entries(notification.data || {}).map(([k, v]) => [
            k,
            String(v),
          ]),
        ),
      },
      android: {
        priority: notification.priority === "high" ? "high" : "normal",
        notification: {
          sound: "default",
          channelId: "fixzit_notifications",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: "/img/logo.jpg",
          badge: "/img/badge.png",
          requireInteraction: notification.priority === "high",
        },
      },
    };

    // Send notification
    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info("[FCM] Push notification sent", {
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((resp: messaging.SendResponse, idx: number) =>
          !resp.success ? tokens[idx] : null,
        )
        .filter(Boolean) as string[];

      await removeInvalidFCMTokens(userId, failedTokens);
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FCM] Failed to send push notification", { error, userId });
    throw error;
  }
}

async function getUserFCMTokens(userId: string): Promise<string[]> {
  // Query database for user's FCM tokens
  // This would come from a UserDevices collection
  try {
    const { User } = await import("@/server/models/User");
    const user = (await User.findOne({ userId })
      .select("fcmTokens")
      .lean()) as { fcmTokens?: string[] } | null;
    return user?.fcmTokens || [];
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FCM] Failed to get user tokens", { error, userId });
    return [];
  }
}

async function removeInvalidFCMTokens(
  userId: string,
  tokens: string[],
): Promise<void> {
  try {
    const { User } = await import("@/server/models/User");
    await User.updateOne({ userId }, { $pull: { fcmTokens: { $in: tokens } } });
    logger.info("[FCM] Removed invalid tokens", {
      userId,
      count: tokens.length,
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[FCM] Failed to remove invalid tokens", { error, userId });
  }
}

// =============================================================================
// SendGrid - Email Notifications
// =============================================================================

let sendGridInitialized = false;
let sgMailInstance: SendGridMail | null = null;

async function initializeSendGrid() {
  if (sendGridInitialized) return sgMailInstance!;

  try {
    // Use getEnv with alias support for Vercel naming conventions
    // Checks: SENDGRID_API_KEY, SEND_GRID, SEND_GRID_EMAIL_FIXZIT_TOKEN
    const sendgridApiKey = getEnv("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      logger.warn("[SendGrid] API key not configured (checked SENDGRID_API_KEY, SEND_GRID, SEND_GRID_EMAIL_FIXZIT_TOKEN)");
      throw new Error("SendGrid not configured");
    }

    const sgMail = await resolveModuleDefault<SendGridMail>(
      import("@sendgrid/mail"),
    );
    sgMailInstance = sgMail;
    sgMail.setApiKey(sendgridApiKey);
    sendGridInitialized = true;
    logger.info("[SendGrid] Initialized successfully");
    return sgMail;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SendGrid] Initialization failed", { error });
    throw error;
  }
}

export async function sendEmailNotification(
  recipient: NotificationRecipient,
  notification: NotificationPayload,
): Promise<void> {
  try {
    const sgMail = await initializeSendGrid();

    if (!sendGridInitialized || !sgMailInstance) {
      logger.warn("[SendGrid] Skipping email notification (not initialized)");
      throw new Error("SendGrid not configured");
    }

    if (!recipient.email) {
      logger.warn("[SendGrid] No email address for recipient", {
        userId: recipient.userId,
      });
      return;
    }

    // Build email message
    const message = {
      to: recipient.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || EMAIL_DOMAINS.noReply,
        name: process.env.SENDGRID_FROM_NAME || "Fixzit",
      },
      subject: notification.title,
      text: notification.body,
      html: buildEmailHTML(notification, recipient),
      categories: ["notification", notification.event],
      customArgs: {
        notificationId: notification.id,
        userId: recipient.userId,
        event: notification.event,
      },
    };

    // Use template if configured
    if (process.env.SENDGRID_TEMPLATE_NOTIFICATION) {
      Object.assign(message, {
        templateId: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
        dynamicTemplateData: {
          name: recipient.name,
          title: notification.title,
          body: notification.body,
          deepLink: notification.deepLink,
          actionUrl: notification.deepLink
            ? `https://fixzit.co${notification.deepLink.replace("fixzit://", "/")}`
            : undefined,
          priority: notification.priority,
          ...notification.data,
        },
      });
    }

    // Send email
    await sgMail.send(message);

    logger.info("[SendGrid] Email sent successfully", {
      to: recipient.email,
      subject: notification.title,
    });
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorDetails =
      typeof error === "object" && error !== null
        ? (error as {
            message?: string;
            code?: unknown;
            response?: { body?: unknown };
          })
        : undefined;

    logger.error("[SendGrid] Failed to send email", {
      error:
        errorDetails?.message ??
        (error instanceof Error ? error.message : String(error)),
      code: errorDetails?.code,
      response: errorDetails?.response?.body,
    });
    throw error;
  }
}

function buildEmailHTML(
  notification: NotificationPayload,
  recipient: NotificationRecipient,
): string {
  const actionButton = notification.deepLink
    ? `<a href="https://fixzit.co${notification.deepLink.replace("fixzit://", "/")}" style="display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">View Details</a>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f4f4f4; padding: 20px; border-radius: 8px;">
        <h1 style="color: #0066cc; margin-top: 0;">${notification.title}</h1>
        <p style="font-size: 16px;">${notification.body}</p>
        ${actionButton}
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent to ${recipient.email} as part of your Fixzit notifications.
          <br>
          If you no longer wish to receive these emails, you can 
          <a href="https://fixzit.co/settings/notifications" style="color: #0066cc;">manage your notification preferences</a>.
        </p>
      </div>
    </body>
    </html>
  `;
}

// =============================================================================
// Twilio - SMS Notifications
// =============================================================================

// Twilio client type (using Twilio's actual types would be ideal, but any is acceptable here for dynamic import)
let twilioClient: ReturnType<typeof import("twilio")> | null = null;

async function initializeTwilio() {
  if (twilioClient) return twilioClient;

  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn("[Twilio] Credentials not configured");
      throw new Error("Twilio not configured");
    }

    const TwilioClient = await resolveModuleDefault<typeof import("twilio")>(
      import("twilio"),
    );
    twilioClient = TwilioClient(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    logger.info("[Twilio] Initialized successfully");
    return twilioClient;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Twilio] Initialization failed", { error });
    throw error;
  }
}

export async function sendSMSNotification(
  recipient: NotificationRecipient,
  notification: NotificationPayload,
): Promise<void> {
  try {
    await initializeTwilio();

    if (!twilioClient) {
      logger.warn("[Twilio] Skipping SMS notification (not initialized)");
      throw new Error("Twilio SMS not configured");
    }

    if (!recipient.phone) {
      logger.warn("[Twilio] No phone number for recipient", {
        userId: recipient.userId,
      });
      return;
    }

    // Format message (SMS has 160 character limit for single message)
    const message = `${notification.title}\n${notification.body}`;
    const truncatedMessage =
      message.length > 160 ? message.substring(0, 157) + "..." : message;

    // Send SMS
    const response = await twilioClient.messages.create({
      body: truncatedMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient.phone,
      statusCallback: `${process.env.NEXTAUTH_URL}/api/webhooks/twilio/status`,
    });

    logger.info("[Twilio] SMS sent successfully", {
      to: recipient.phone,
      sid: response.sid,
      status: response.status,
    });
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const details =
      typeof error === "object" && error !== null
        ? (error as { message?: string; code?: unknown; status?: unknown })
        : undefined;

    logger.error("[Twilio] Failed to send SMS", {
      error:
        details?.message ??
        (error instanceof Error ? error.message : String(error)),
      code: details?.code,
      status: details?.status,
    });
    throw error;
  }
}

// =============================================================================
// WhatsApp Business API - WhatsApp Notifications
// =============================================================================

export async function sendWhatsAppNotification(
  recipient: NotificationRecipient,
  notification: NotificationPayload,
): Promise<void> {
  try {
    if (
      !process.env.WHATSAPP_BUSINESS_API_KEY ||
      !process.env.WHATSAPP_PHONE_NUMBER_ID
    ) {
      logger.warn("[WhatsApp] API credentials not configured");
      throw new Error("WhatsApp Business API not configured");
    }

    if (!recipient.phone) {
      logger.warn("[WhatsApp] No phone number for recipient", {
        userId: recipient.userId,
      });
      return;
    }

    // WhatsApp Business API requires approved templates
    // Using template-based messaging
    const templateName = getWhatsAppTemplate(notification.event);

    if (!templateName) {
      logger.warn("[WhatsApp] No template for event", {
        event: notification.event,
      });
      return;
    }

    // Format phone number (WhatsApp requires E.164 format)
    const phoneNumber = formatPhoneForWhatsApp(recipient.phone);

    // Send WhatsApp message via WhatsApp Business API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "ar", // Arabic for Saudi market
          },
          components: [
            {
              type: "body",
              parameters: extractWhatsAppParameters(notification),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_BUSINESS_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    logger.info("[WhatsApp] Message sent successfully", {
      to: phoneNumber,
      messageId: response.data.messages?.[0]?.id,
      template: templateName,
    });
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const details =
      typeof error === "object" && error !== null
        ? (error as { message?: string; response?: { data?: unknown } })
        : undefined;

    logger.error("[WhatsApp] Failed to send message", {
      error:
        details?.message ??
        (error instanceof Error ? error.message : String(error)),
      response: details?.response?.data,
    });
    throw error;
  }
}

function getWhatsAppTemplate(event: string): string | null {
  // Map events to approved WhatsApp templates
  const templateMap: Record<string, string> = {
    onTicketCreated: "work_order_created",
    onAssign: "work_order_assigned",
    onApprovalRequested: "approval_required",
    onApproved: "approval_granted",
    onClosed: "work_order_closed",
  };

  return templateMap[event] || null;
}

function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Add country code if missing (assume Saudi Arabia +966)
  if (!cleaned.startsWith("966")) {
    // Remove leading zero if present
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    cleaned = "966" + cleaned;
  }

  return cleaned;
}

type WhatsAppParameter = { type: "text"; text: string };

function coerceString(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function extractWhatsAppParameters(
  notification: NotificationPayload,
): WhatsAppParameter[] {
  // Extract dynamic parameters from notification data
  // WhatsApp templates have placeholders like {{1}}, {{2}}, etc.
  const params: WhatsAppParameter[] = [];

  switch (notification.event) {
    case "onTicketCreated":
      params.push(
        { type: "text", text: coerceString(notification.data?.workOrderId) },
        { type: "text", text: coerceString(notification.data?.tenantName) },
      );
      break;

    case "onAssign":
      params.push(
        { type: "text", text: coerceString(notification.data?.workOrderId) },
        { type: "text", text: coerceString(notification.data?.technicianName) },
      );
      break;

    case "onApprovalRequested":
      params.push(
        { type: "text", text: coerceString(notification.data?.quotationId) },
        {
          type: "text",
          text: `SAR ${
            typeof notification.data?.amount === "number"
              ? notification.data.amount.toLocaleString()
              : "0"
          }`,
        },
      );
      break;

    case "onClosed":
      params.push({
        type: "text",
        text: coerceString(notification.data?.workOrderId),
      });
      break;
  }

  return params;
}

// =============================================================================
// Bulk Notification Helper
// =============================================================================

type ChannelSenders = {
  push: typeof sendFCMNotification;
  email: typeof sendEmailNotification;
  sms: typeof sendSMSNotification;
  whatsapp: typeof sendWhatsAppNotification;
};

interface BulkNotificationOptions {
  senders?: Partial<ChannelSenders>;
}

export async function sendBulkNotifications(
  notification: NotificationPayload,
  recipients: NotificationRecipient[],
  options: BulkNotificationOptions = {},
): Promise<BulkNotificationResult> {
  logger.info("[Notifications] Sending bulk notifications", {
    count: recipients.length,
    event: notification.event,
  });

  const channelMetrics = createChannelMetricsMap();

  const result: BulkNotificationResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    issues: [],
    channelMetrics,
  };

  if (recipients.length === 0) {
    return result;
  }

  const senders: ChannelSenders = {
    push: options.senders?.push ?? sendFCMNotification,
    email: options.senders?.email ?? sendEmailNotification,
    sms: options.senders?.sms ?? sendSMSNotification,
    whatsapp: options.senders?.whatsapp ?? sendWhatsAppNotification,
  };

  const batchSize = 50;
  const batchCount = Math.ceil(recipients.length / batchSize);

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const batch = recipients.slice(
      batchIndex * batchSize,
      (batchIndex + 1) * batchSize,
    );

    await Promise.all(
      batch.map(async (recipient) => {
        for (const channel of recipient.preferredChannels) {
          const validationError = validateRecipientChannel(recipient, channel);
          if (validationError) {
            result.skipped += 1;
            channelMetrics[channel].skipped += 1;
            result.issues.push({
              userId: recipient.userId,
              channel,
              type: "skipped",
              reason: validationError,
              attemptedAt: new Date(),
              metadata: { validationError: true },
            });
            logger.warn("[Notifications] Skipping channel for recipient", {
              userId: recipient.userId,
              channel,
              reason: validationError,
            });
            continue;
          }

          result.attempted += 1;
          channelMetrics[channel].attempted += 1;
          const attemptNumber = channelMetrics[channel].attempted;
          const attemptTimestamp = new Date();
          channelMetrics[channel].lastAttemptAt = attemptTimestamp;

          try {
            switch (channel) {
              case "push":
                await senders.push(recipient.userId, notification);
                break;
              case "email":
                await senders.email(recipient, notification);
                break;
              case "sms":
                await senders.sms(recipient, notification);
                break;
              case "whatsapp":
                await senders.whatsapp(recipient, notification);
                break;
            }
            result.succeeded += 1;
            channelMetrics[channel].succeeded += 1;
          } catch (_error) {
            const error =
              _error instanceof Error ? _error : new Error(String(_error));
            void error;
            result.failed += 1;
            channelMetrics[channel].failed += 1;
            const reason =
              error instanceof Error ? error.message : "Unknown error";
            if (channelMetrics[channel].errors.length < 10) {
              channelMetrics[channel].errors.push(reason);
            }
            result.issues.push({
              userId: recipient.userId,
              channel,
              type: "failed",
              reason,
              attempt: attemptNumber,
              attemptedAt: attemptTimestamp,
            });
            logger.error("[Notifications] Failed to send to recipient", {
              error,
              userId: recipient.userId,
              channel,
            });
          }
        }
      }),
    );

    if (batchIndex < batchCount - 1) {
      await delay(1000);
    }
  }

  logger.info("[Notifications] Bulk notifications sent", {
    count: recipients.length,
    event: notification.event,
    attempted: result.attempted,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

function validateRecipientChannel(
  recipient: NotificationRecipient,
  channel: NotificationChannel,
): string | null {
  switch (channel) {
    case "email":
      return recipient.email ? null : "Missing email address";
    case "sms":
    case "whatsapp":
      return recipient.phone ? null : "Missing phone number";
    case "push":
      return recipient.userId ? null : "Missing userId";
    default:
      return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
