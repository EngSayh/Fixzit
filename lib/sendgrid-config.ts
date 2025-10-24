/**
 * SendGrid Email Service Configuration
 * 
 * Centralized configuration for all SendGrid features including:
 * - API key management
 * - Sender identities (from/reply-to)
 * - Dynamic templates
 * - Advanced features (unsubscribe groups, IP pools)
 * - Webhook verification
 * 
 * @see https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
 * @see https://docs.sendgrid.com/ui/sending-email/sender-verification
 */

import sgMail from '@sendgrid/mail';

export interface SendGridConfig {
  apiKey: string;
  from: {
    email: string;
    name: string;
  };
  replyTo?: {
    email: string;
    name: string;
  };
  unsubscribeGroupId?: number;
  ipPoolName?: string;
  webhookVerificationKey?: string;
  templates: {
    welcome?: string;
    passwordReset?: string;
    notification?: string;
    invoice?: string;
  };
}

/**
 * Get SendGrid configuration from environment variables
 */
export function getSendGridConfig(): SendGridConfig {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  // Support both new and legacy environment variable names
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@fixzit.co';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Fixzit';
  
  const replyToEmail = process.env.SENDGRID_REPLY_TO_EMAIL;
  const replyToName = process.env.SENDGRID_REPLY_TO_NAME || 'Fixzit Support';

  return {
    apiKey,
    from: {
      email: fromEmail,
      name: fromName
    },
    replyTo: replyToEmail ? {
      email: replyToEmail,
      name: replyToName
    } : undefined,
    unsubscribeGroupId: process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID 
      ? parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID) 
      : undefined,
    ipPoolName: process.env.SENDGRID_IP_POOL_NAME,
    webhookVerificationKey: process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY,
    templates: {
      welcome: process.env.SENDGRID_TEMPLATE_WELCOME,
      passwordReset: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET,
      notification: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
      invoice: process.env.SENDGRID_TEMPLATE_INVOICE
    }
  };
}

/**
 * Initialize SendGrid with API key
 * Should be called once at application startup
 */
export function initializeSendGrid(): void {
  try {
    const config = getSendGridConfig();
    sgMail.setApiKey(config.apiKey);
    console.log('✅ SendGrid initialized successfully');
  } catch (error) {
    console.warn('⚠️ SendGrid not configured:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Check if SendGrid is properly configured
 */
export function isSendGridConfigured(): boolean {
  return !!(process.env.SENDGRID_API_KEY || process.env.AWS_SES_ACCESS_KEY || process.env.EMAIL_SERVICE_ENABLED);
}

/**
 * Get base email options with configured sender and reply-to
 */
export function getBaseEmailOptions() {
  const config = getSendGridConfig();
  
  return {
    from: {
      email: config.from.email,
      name: config.from.name
    },
    replyTo: config.replyTo ? {
      email: config.replyTo.email,
      name: config.replyTo.name
    } : undefined,
    trackingSettings: {
      clickTracking: { enable: true, enableText: false },
      openTracking: { enable: true }
    },
    ...(config.unsubscribeGroupId && { 
      asm: { 
        groupId: config.unsubscribeGroupId 
      } 
    }),
    ...(config.ipPoolName && { 
      ipPoolName: config.ipPoolName 
    })
  };
}

/**
 * Verify SendGrid webhook signature
 * 
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security
 */
export function verifyWebhookSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const crypto = require('crypto');
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    
    if (!verificationKey) {
      console.warn('⚠️ SENDGRID_WEBHOOK_VERIFICATION_KEY not configured - skipping verification');
      return true; // Allow in development
    }

    const timestampedPayload = timestamp + payload;
    const expectedSignature = crypto
      .createHmac('sha256', verificationKey)
      .update(timestampedPayload)
      .digest('base64');

    return signature === expectedSignature;
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    return false;
  }
}

/**
 * Get template ID by name
 */
export function getTemplateId(templateName: keyof SendGridConfig['templates']): string | undefined {
  const config = getSendGridConfig();
  return config.templates[templateName];
}
