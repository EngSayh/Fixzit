import { logger } from '@/lib/logger';
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

import crypto from 'crypto';
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
      ? parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID, 10) 
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
    logger.info('✅ SendGrid initialized successfully');
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.warn('SendGrid not configured', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
 * SECURITY FIX: Use timing-safe comparison to prevent timing attacks
 * 
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security
 * @see https://owasp.org/www-community/attacks/Timing_attack
 */
export function verifyWebhookSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    const WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS = 5 * 60; // 5 minutes
    
    // SECURITY: Production MUST have webhook verification enabled
    if (!verificationKey) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('🚨 CRITICAL: SENDGRID_WEBHOOK_VERIFICATION_KEY not configured in production');
        logger.error('🚨 Rejecting webhook request for security');
        return false; // Fail-safe in production
      }
      logger.warn('⚠️ SENDGRID_WEBHOOK_VERIFICATION_KEY not configured - allowing in development');
      return true; // Allow in development only
    }

    // Validate timestamp to prevent replay attacks
    const requestTimestamp = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    
    if (isNaN(requestTimestamp) || Math.abs(now - requestTimestamp) > WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS) {
      logger.warn('Webhook timestamp expired or invalid', { timestamp });
      return false;
    }

    // Compute expected signature using HMAC-SHA256
    const timestampedPayload = timestamp + payload;
    const expectedSignature = crypto
      .createHmac('sha256', verificationKey)
      .update(timestampedPayload)
      .digest('base64');

    // CRITICAL SECURITY FIX: Use timing-safe comparison with correct encoding
    // Both signature and expectedSignature are base64-encoded
    // Using 'base64' encoding ensures we compare the actual signature bytes
    const signatureBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');
    
    // Both buffers must be same length for timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('❌ Webhook verification failed:', { error });
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
