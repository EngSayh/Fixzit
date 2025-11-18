import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';
import { sendSMS as sendSMSViaService } from '@/lib/sms';
import { newTranslations } from '@/i18n/new-translations';

/**
 * Seller Notification Templates for Souq Marketplace
 */

type Locale = 'en' | 'ar';

interface SellerDetails {
  email: string;
  phone?: string;
  preferredLocale?: Locale;
  businessName: string;
}

type TemplatePayloads = {
  BUDGET_LOW: { budgetRemaining: number; campaignName: string };
  BUDGET_DEPLETED: { campaignName: string };
  REFUND_PROCESSED: { amount: number; orderId: string; refundId: string };
  WITHDRAWAL_COMPLETE: { amount: number; iban: string };
};

type TemplateKey = keyof TemplatePayloads;

interface TranslationConfig {
  subject: { key: string; fallback: string };
  body: { key: string; fallback: string };
  sms: { key: string; fallback: string };
}

const templateTranslations: Record<TemplateKey, TranslationConfig> = {
  BUDGET_LOW: {
    subject: {
      key: 'notifications.seller.budgetLow.subject',
      fallback: 'Warning: Ad Budget Running Low',
    },
    body: {
      key: 'notifications.seller.budgetLow.body',
      fallback:
        'Your ad campaign "{{campaignName}}" has only {{budgetRemaining}} SAR remaining. Consider adding funds to avoid campaign interruption.',
    },
    sms: {
      key: 'notifications.seller.budgetLow.sms',
      fallback:
        'Fixzit Alert: Ad budget low - {{budgetRemaining}} SAR remaining. Add funds to continue.',
    },
  },
  BUDGET_DEPLETED: {
    subject: {
      key: 'notifications.seller.budgetDepleted.subject',
      fallback: 'Alert: Ad Budget Depleted',
    },
    body: {
      key: 'notifications.seller.budgetDepleted.body',
      fallback:
        'Your ad campaign "{{campaignName}}" has been paused due to insufficient funds. Add budget to resume advertising.',
    },
    sms: {
      key: 'notifications.seller.budgetDepleted.sms',
      fallback: 'Fixzit Alert: Ad campaign paused - budget depleted. Add funds to resume.',
    },
  },
  REFUND_PROCESSED: {
    subject: {
      key: 'notifications.seller.refundProcessed.subject',
      fallback: 'Refund Processed Successfully',
    },
    body: {
      key: 'notifications.seller.refundProcessed.body',
      fallback:
        'A refund of {{amount}} SAR has been processed for order {{orderId}}. Refund ID: {{refundId}}. The amount will be credited to your account within 5-7 business days.',
    },
    sms: {
      key: 'notifications.seller.refundProcessed.sms',
      fallback: 'Fixzit: Refund of {{amount}} SAR processed for order {{orderId}}.',
    },
  },
  WITHDRAWAL_COMPLETE: {
    subject: {
      key: 'notifications.seller.withdrawalComplete.subject',
      fallback: 'Withdrawal Completed Successfully',
    },
    body: {
      key: 'notifications.seller.withdrawalComplete.body',
      fallback:
        'Your withdrawal of {{amount}} SAR has been processed successfully to account {{iban}}. The funds should arrive within 1-3 business days.',
    },
    sms: {
      key: 'notifications.seller.withdrawalComplete.sms',
      fallback: 'Fixzit: Withdrawal of {{amount}} SAR completed successfully.',
    },
  },
};

const FALLBACK_LOCALE: Locale = 'en';

const translationCatalog: Record<Locale, Record<string, string>> = {
  en: { ...newTranslations.en },
  ar: { ...newTranslations.ar },
};

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(pattern, String(value));
  }, template);
};

const translateTemplate = (
  locale: Locale,
  config: TranslationConfig[keyof TranslationConfig],
  params?: Record<string, string | number>
) => {
  const dictionary = translationCatalog[locale] ?? translationCatalog[FALLBACK_LOCALE];
  const template = dictionary?.[config.key] || config.fallback;
  return interpolate(template, params);
};

/**
 * Get seller details from database
 */
async function getSeller(sellerId: string): Promise<SellerDetails | null> {
  try {
    const db = await getDatabase();
    const seller = await db.collection('souq_sellers').findOne({ sellerId });
    
    if (!seller) {
      logger.warn('[SellerNotification] Seller not found', { sellerId });
      return null;
    }
    
    return {
      email: seller.contactEmail || seller.email,
      phone: seller.contactPhone || seller.phone,
      preferredLocale: seller.preferredLocale || 'ar', // Default to Arabic for Saudi market
      businessName: seller.businessName || 'Seller'
    };
  } catch (error) {
    logger.error('[SellerNotification] Error fetching seller', { error, sellerId });
    return null;
  }
}

/**
 * Send email via SendGrid (if configured)
 */
async function sendEmail(to: string, subject: string, body: string, locale: Locale): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('[SellerNotification] SendGrid not configured, skipping email');
    return;
  }
  const header = translateTemplate(locale, {
    key: 'notifications.seller.email.brand',
    fallback: 'Fixzit Marketplace',
  });
  const footer = translateTemplate(locale, {
    key: 'notifications.seller.email.footer',
    fallback: 'This is an automated notification from Fixzit Marketplace.',
  });
  const support = translateTemplate(locale, {
    key: 'notifications.seller.email.support',
    fallback: 'For support, contact seller-support@fixzit.sa',
  });
  
  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'notifications@fixzit.sa',
      subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">
            ${header}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #666;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            ${footer}<br>
            ${support}
          </p>
        </div>
      `
    });
    
    logger.info('[SellerNotification] Email sent', { to, subject });
  } catch (error) {
    logger.error('[SellerNotification] Email send failed', { error, to, subject });
  }
}

/**
 * Send SMS using the centralized SMS service
 */
async function sendSMS(to: string, message: string): Promise<void> {
  const result = await sendSMSViaService(to, message);
  
  if (!result.success) {
    logger.warn('[SellerNotification] SMS send failed', { 
      to, 
      error: result.error 
    });
  }
}

/**
 * Send notification to seller
 */
export async function sendSellerNotification<T extends TemplateKey>(
  sellerId: string,
  template: T,
  data: TemplatePayloads[T]
): Promise<void> {
  try {
    const seller = await getSeller(sellerId);
    
    if (!seller) {
      logger.warn('[SellerNotification] Cannot send notification - seller not found', { sellerId });
      return;
    }
    
    const locale = seller.preferredLocale || 'ar';
    const templateConfig = templateTranslations[template];
    const params = data as Record<string, string | number>;
    const subject = translateTemplate(locale, templateConfig.subject, params);
    const body = translateTemplate(locale, templateConfig.body, params);
    await sendEmail(seller.email, subject, body, locale);
    
    if (seller.phone) {
      const smsMessage = translateTemplate(locale, templateConfig.sms, params);
      await sendSMS(seller.phone, smsMessage);
    }
    
    // Log notification in database for tracking
    await logNotification(sellerId, template, data, locale);
    
    logger.info('[SellerNotification] Notification sent', { sellerId, template, locale });
  } catch (error) {
    logger.error('[SellerNotification] Error sending notification', { error, sellerId, template });
  }
}

/**
 * Log notification in database for audit trail
 */
async function logNotification(
  sellerId: string,
  template: string,
  data: Record<string, unknown>,
  locale: string
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection('seller_notifications').insertOne({
      sellerId,
      template,
      data,
      locale,
      sentAt: new Date(),
      status: 'sent'
    });
  } catch (error) {
    logger.error('[SellerNotification] Error logging notification', { error });
  }
}
