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
 * Verify SendGrid webhook signature using ECDSA
 * 
 * SECURITY FIX: Now uses proper ECDSA verification instead of HMAC
 * - SendGrid signs with ECDSA P-256 (secp256r1)
 * - Public key is sent in x-twilio-email-event-webhook-public-key header
 * - Signature is base64-encoded ECDSA signature
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
    
    // FIX 1: Validate payload size using Buffer.byteLength (not string.length)
    const MAX_PAYLOAD_SIZE = 25 * 1024 * 1024; // 25 MB
    const payloadSize = Buffer.byteLength(payload, 'utf8');
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      console.error(`❌ Payload size ${payloadSize} exceeds limit ${MAX_PAYLOAD_SIZE}`);
      return false;
    }

    // Allow bypass in development if no key configured
    if (!publicKey && process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Public key not provided - skipping verification in development');
      return true;
    }

    if (!publicKey) {
      console.error('❌ Public key required for webhook verification');
      return false;
    }

    // FIX 2: Use ECDSA verification (not HMAC)
    // SendGrid uses ECDSA with P-256 curve
    const timestampedPayload = timestamp + payload;
    
    // Create verify object with SHA-256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(timestampedPayload);
    verifier.end();

    // Verify signature with public key
    // Public key format: base64-encoded EC public key (PEM format expected)
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    const isValid = verifier.verify(publicKeyPem, signature, 'base64');

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
    }

    return isValid;
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
