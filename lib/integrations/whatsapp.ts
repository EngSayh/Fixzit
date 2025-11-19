/**
 * WhatsApp Business API Integration
 * 
 * Provides WhatsApp messaging capabilities via WhatsApp Business Platform.
 * Supports sending template messages and text messages.
 * 
 * Setup Instructions:
 * 1. Register for WhatsApp Business Platform: https://business.whatsapp.com/
 * 2. Get your credentials from Meta Business Manager
 * 3. Add environment variables:
 *    - WHATSAPP_BUSINESS_ACCOUNT_ID
 *    - WHATSAPP_PHONE_NUMBER_ID
 *    - WHATSAPP_ACCESS_TOKEN
 * 4. Configure webhook endpoint for incoming messages (optional)
 * 
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { logger } from '@/lib/logger';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
}

/**
 * Get WhatsApp configuration from environment
 */
function getWhatsAppConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!phoneNumberId || !accessToken || !businessAccountId) {
    return null;
  }

  return { phoneNumberId, accessToken, businessAccountId };
}

/**
 * Check if WhatsApp integration is enabled
 */
export function isWhatsAppEnabled(): boolean {
  return getWhatsAppConfig() !== null;
}

/**
 * Normalize phone number to E.164 format
 * Accepts: +966501234567, 966501234567, 0501234567
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, replace with country code (assume Saudi Arabia 966)
  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.substring(1);
  }

  // Ensure it starts with country code
  if (!cleaned.startsWith('966') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }

  return cleaned;
}

interface SendTextMessageParams {
  to: string; // Phone number in E.164 format
  message: string;
  previewUrl?: boolean;
}

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppTextMessage(
  params: SendTextMessageParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  const { to, message, previewUrl = false } = params;
  const normalizedPhone = normalizePhoneNumber(to);

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: previewUrl,
            body: message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error('[WhatsApp] Failed to send message', { error, to: normalizedPhone });
      return { success: false, error: error.error?.message || 'Failed to send' };
    }

    const data = await response.json();
    logger.info('[WhatsApp] Message sent successfully', { messageId: data.messages?.[0]?.id, to: normalizedPhone });

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[WhatsApp] Error sending message', { error, to: normalizedPhone });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

interface SendTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode: string; // e.g., 'en', 'ar'
  components?: {
    type: 'header' | 'body' | 'button';
    parameters: TemplateParameter[];
  }[];
}

/**
 * Send a template message via WhatsApp
 * Templates must be pre-approved in Meta Business Manager
 */
export async function sendWhatsAppTemplateMessage(
  params: SendTemplateMessageParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  const { to, templateName, languageCode, components = [] } = params;
  const normalizedPhone = normalizePhoneNumber(to);

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components.length > 0 ? components : undefined,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error('[WhatsApp] Failed to send template', { error, to: normalizedPhone, templateName });
      return { success: false, error: error.error?.message || 'Failed to send' };
    }

    const data = await response.json();
    logger.info('[WhatsApp] Template sent successfully', {
      messageId: data.messages?.[0]?.id,
      to: normalizedPhone,
      templateName,
    });

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[WhatsApp] Error sending template', { error, to: normalizedPhone, templateName });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Common template examples
 * These must be created and approved in Meta Business Manager
 */
export const WhatsAppTemplates = {
  // Order notifications
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  
  // Payment notifications
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_REMINDER: 'payment_reminder',
  
  // Work order notifications
  WO_CREATED: 'workorder_created',
  WO_ASSIGNED: 'workorder_assigned',
  WO_COMPLETED: 'workorder_completed',
  
  // Authentication
  OTP_VERIFICATION: 'otp_verification',
  
  // General
  WELCOME_MESSAGE: 'welcome_message',
  APPOINTMENT_REMINDER: 'appointment_reminder',
} as const;

/**
 * Example: Send OTP via WhatsApp
 */
export async function sendWhatsAppOTP(
  phoneNumber: string,
  otp: string,
  expiryMinutes: number = 5
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendWhatsAppTemplateMessage({
    to: phoneNumber,
    templateName: WhatsAppTemplates.OTP_VERIFICATION,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: otp },
          { type: 'text', text: String(expiryMinutes) },
        ],
      },
    ],
  });
}

/**
 * Example: Send work order notification
 */
export async function sendWorkOrderNotification(
  phoneNumber: string,
  workOrderNumber: string,
  propertyName: string,
  assigneeName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendWhatsAppTemplateMessage({
    to: phoneNumber,
    templateName: WhatsAppTemplates.WO_ASSIGNED,
    languageCode: 'ar', // Use Arabic for Saudi market
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: workOrderNumber },
          { type: 'text', text: propertyName },
          { type: 'text', text: assigneeName },
        ],
      },
    ],
  });
}
