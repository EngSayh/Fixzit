/**
 * @fileoverview Notification Channel Handlers
 * @description Unified handlers for email, SMS, and WhatsApp notifications
 * @module api/admin/notifications/_lib/channel-handlers
 */

import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { logCommunication } from "@/lib/communication-logger";
import { logger } from "@/lib/logger";

export interface NotificationContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface ChannelResult {
  sent: number;
  failed: number;
}

export interface NotificationMetadata {
  broadcastId: string;
  triggeredBy: string;
  triggeredByEmail?: string;
  priority: string;
}

type LogPromise = Promise<unknown>;

/**
 * Send email notification
 */
export async function sendEmailNotification(
  contact: NotificationContact,
  subject: string,
  message: string,
  orgId: string,
  metadata: NotificationMetadata,
  enqueueLog: (promise: LogPromise) => void,
): Promise<boolean> {
  if (!contact.email) return false;

  try {
    const emailResult = await sendEmail(contact.email, subject, message);
    
    enqueueLog(
      logCommunication({
        orgId,
        userId: contact.id,
        channel: "email",
        type: "broadcast",
        recipient: contact.email,
        subject,
        message,
        status: emailResult.success ? "sent" : "failed",
        errorMessage: emailResult.success ? undefined : emailResult.error,
        metadata: {
          email: contact.email,
          name: contact.name,
          priority: metadata.priority,
          broadcastId: metadata.broadcastId,
          triggeredBy: metadata.triggeredBy,
          sendgridId: emailResult.messageId,
          triggeredByEmail: metadata.triggeredByEmail,
        },
      })
        .then((result) => {
          if (!result.success) {
            logger.warn("[Admin Notification] Communication log failed", {
              error: result.error,
              channel: "email",
              recipient: contact.email,
            });
          }
        })
        .catch((error) => {
          logger.error("[Admin Notification] Communication log error", error as Error, {
            channel: "email",
            recipient: contact.email,
          });
        }),
    );

    if (!emailResult.success) {
      logger.error("[Admin Notification] Email failed", {
        email: contact.email,
        error: emailResult.error,
      });
    }

    return emailResult.success;
  } catch (error) {
    logger.error("[Admin Notification] Email failed", {
      error,
      email: contact.email,
    });

    enqueueLog(
      logCommunication({
        orgId,
        userId: contact.id,
        channel: "email",
        type: "broadcast",
        recipient: contact.email,
        subject,
        message,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: {
          email: contact.email,
          name: contact.name,
          priority: metadata.priority,
          broadcastId: metadata.broadcastId,
          triggeredBy: metadata.triggeredBy,
          triggeredByEmail: metadata.triggeredByEmail,
        },
      }).catch((err) => { logger.debug("[Notification] Logging failed (non-blocking)", { err }); }),
    );

    return false;
  }
}

/**
 * Send SMS notification
 */
export async function sendSmsNotification(
  contact: NotificationContact,
  subject: string,
  message: string,
  orgId: string,
  metadata: NotificationMetadata,
  enqueueLog: (promise: LogPromise) => void,
): Promise<boolean> {
  if (!contact.phone) return false;

  const smsBody = `${subject}\n\n${message}`;

  try {
    const smsResult = await sendSMS(contact.phone, smsBody);

    enqueueLog(
      logCommunication({
        orgId,
        userId: contact.id,
        channel: "sms",
        type: "broadcast",
        recipient: contact.phone,
        subject,
        message: smsBody,
        status: smsResult.success ? "sent" : "failed",
        errorMessage: smsResult.success ? undefined : smsResult.error,
        metadata: {
          phone: contact.phone,
          name: contact.name,
          priority: metadata.priority,
          broadcastId: metadata.broadcastId,
          triggeredBy: metadata.triggeredBy,
          segments: Math.max(1, Math.ceil(smsBody.length / 160)),
        },
      }).catch((err) => { logger.debug("[Notification] Logging failed (non-blocking)", { err }); }),
    );

    if (!smsResult.success) {
      logger.error("[Admin Notification] SMS failed", {
        phone: contact.phone,
        error: smsResult.error,
      });
    }

    return smsResult.success;
  } catch (error) {
    logger.error("[Admin Notification] SMS failed", {
      error,
      phone: contact.phone,
    });

    enqueueLog(
      logCommunication({
        orgId,
        userId: contact.id,
        channel: "sms",
        type: "broadcast",
        recipient: contact.phone,
        subject,
        message: smsBody,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: {
          phone: contact.phone,
          name: contact.name,
          priority: metadata.priority,
          broadcastId: metadata.broadcastId,
          triggeredBy: metadata.triggeredBy,
        },
      }).catch((err) => { logger.debug("[Notification] Logging failed (non-blocking)", { err }); }),
    );

    return false;
  }
}

/**
 * Send WhatsApp notification
 */
export async function sendWhatsAppNotification(
  contact: NotificationContact,
  subject: string,
  message: string,
  orgId: string,
  metadata: NotificationMetadata,
  enqueueLog: (promise: LogPromise) => void,
): Promise<boolean> {
  if (!contact.phone) return false;

  try {
    const { sendWhatsAppTextMessage, isWhatsAppEnabled } = await import(
      "@/lib/integrations/whatsapp"
    );

    if (!isWhatsAppEnabled()) {
      logger.warn("[Admin Notification] WhatsApp not configured", {
        phone: contact.phone,
      });

      enqueueLog(
        logCommunication({
          orgId,
          userId: contact.id,
          channel: "whatsapp",
          type: "broadcast",
          recipient: contact.phone,
          subject,
          message,
          status: "failed",
          errorMessage:
            "WhatsApp Business API not configured. Add WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID to environment.",
          metadata: {
            phone: contact.phone,
            name: contact.name,
            priority: metadata.priority,
            broadcastId: metadata.broadcastId,
            triggeredBy: metadata.triggeredBy,
          },
        }).catch((err) => { logger.debug("[Notification] Logging failed (non-blocking)", { err }); }),
      );

      return false;
    }

    const result = await sendWhatsAppTextMessage({
      to: contact.phone,
      message: `${subject}\n\n${message}`,
    });

    enqueueLog(
      logCommunication({
        orgId,
        userId: contact.id,
        channel: "whatsapp",
        type: "broadcast",
        recipient: contact.phone,
        subject,
        message,
        status: result.success ? "sent" : "failed",
        errorMessage: result.success ? undefined : result.error || "Unknown error",
        metadata: {
          phone: contact.phone,
          name: contact.name,
          priority: metadata.priority,
          broadcastId: metadata.broadcastId,
          triggeredBy: metadata.triggeredBy,
          messageId: result.messageId,
        },
      }).catch((err) => { logger.debug("[Notification] Logging failed (non-blocking)", { err }); }),
    );

    if (!result.success) {
      logger.error("[Admin Notification] WhatsApp failed", {
        phone: contact.phone,
        error: result.error,
      });
    }

    return result.success;
  } catch (error) {
    logger.error("[Admin Notification] WhatsApp failed", {
      error,
      phone: contact.phone,
    });
    return false;
  }
}
