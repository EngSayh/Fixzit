import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';

/**
 * Seller Notification Templates for Souq Marketplace
 */

interface SellerDetails {
  email: string;
  phone?: string;
  preferredLocale?: 'en' | 'ar';
  businessName: string;
}

/**
 * Notification Templates
 */
const templates = {
  BUDGET_LOW: {
    en: {
      subject: 'Warning: Ad Budget Running Low',
      body: (data: { budgetRemaining: number; campaignName: string }) => 
        `Your ad campaign "${data.campaignName}" has only ${data.budgetRemaining} SAR remaining. Consider adding funds to avoid campaign interruption.`,
      sms: (data: { budgetRemaining: number }) =>
        `Fixzit Alert: Ad budget low - ${data.budgetRemaining} SAR remaining. Add funds to continue.`
    },
    ar: {
      subject: 'تحذير: رصيد الإعلانات منخفض',
      body: (data: { budgetRemaining: number; campaignName: string }) =>
        `حملتك الإعلانية "${data.campaignName}" لديها فقط ${data.budgetRemaining} ريال متبقي. يرجى إضافة رصيد لتجنب توقف الحملة.`,
      sms: (data: { budgetRemaining: number }) =>
        `تنبيه فيكسزت: رصيد إعلانات منخفض - ${data.budgetRemaining} ريال. أضف رصيد للاستمرار.`
    }
  },
  
  BUDGET_DEPLETED: {
    en: {
      subject: 'Alert: Ad Budget Depleted',
      body: (data: { campaignName: string }) =>
        `Your ad campaign "${data.campaignName}" has been paused due to insufficient funds. Add budget to resume advertising.`,
      sms: () =>
        `Fixzit Alert: Ad campaign paused - budget depleted. Add funds to resume.`
    },
    ar: {
      subject: 'تنبيه: نفاد رصيد الإعلانات',
      body: (data: { campaignName: string }) =>
        `تم إيقاف حملتك الإعلانية "${data.campaignName}" مؤقتاً بسبب نفاد الرصيد. أضف رصيد لاستئناف الإعلان.`,
      sms: () =>
        `تنبيه فيكسزت: حملة إعلانية متوقفة - نفاد الرصيد. أضف رصيد للاستئناف.`
    }
  },
  
  REFUND_PROCESSED: {
    en: {
      subject: 'Refund Processed Successfully',
      body: (data: { amount: number; orderId: string; refundId: string }) =>
        `A refund of ${data.amount} SAR has been processed for order ${data.orderId}. Refund ID: ${data.refundId}. The amount will be credited to your account within 5-7 business days.`,
      sms: (data: { amount: number; orderId: string }) =>
        `Fixzit: Refund of ${data.amount} SAR processed for order ${data.orderId}.`
    },
    ar: {
      subject: 'تم معالجة الاسترداد بنجاح',
      body: (data: { amount: number; orderId: string; refundId: string }) =>
        `تم معالجة استرداد بقيمة ${data.amount} ريال للطلب ${data.orderId}. رقم الاسترداد: ${data.refundId}. سيتم إضافة المبلغ إلى حسابك خلال 5-7 أيام عمل.`,
      sms: (data: { amount: number; orderId: string }) =>
        `فيكسزت: تم معالجة استرداد ${data.amount} ريال للطلب ${data.orderId}.`
    }
  },
  
  WITHDRAWAL_COMPLETE: {
    en: {
      subject: 'Withdrawal Completed Successfully',
      body: (data: { amount: number; iban: string }) =>
        `Your withdrawal of ${data.amount} SAR has been processed successfully to account ${data.iban}. The funds should arrive within 1-3 business days.`,
      sms: (data: { amount: number }) =>
        `Fixzit: Withdrawal of ${data.amount} SAR completed successfully.`
    },
    ar: {
      subject: 'تم السحب بنجاح',
      body: (data: { amount: number; iban: string }) =>
        `تم معالجة سحبك بقيمة ${data.amount} ريال بنجاح إلى الحساب ${data.iban}. يجب أن تصل الأموال خلال 1-3 أيام عمل.`,
      sms: (data: { amount: number }) =>
        `فيكسزت: تم السحب بنجاح بقيمة ${data.amount} ريال.`
    }
  }
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
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('[SellerNotification] SendGrid not configured, skipping email');
    return;
  }
  
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
            Fixzit Marketplace
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #666;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated notification from Fixzit Marketplace.<br>
            For support, contact seller-support@fixzit.sa
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
 * Send SMS via Twilio/SNS (placeholder - implement when SMS service is configured)
 */
async function sendSMS(to: string, message: string): Promise<void> {
  // TODO: Implement SMS sending via Twilio, AWS SNS, or Unifonic (for KSA)
  logger.info('[SellerNotification] SMS would be sent', { to, message });
  // Placeholder for future implementation
}

/**
 * Send notification to seller
 */
export async function sendSellerNotification(
  sellerId: string,
  template: keyof typeof templates,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const seller = await getSeller(sellerId);
    
    if (!seller) {
      logger.warn('[SellerNotification] Cannot send notification - seller not found', { sellerId });
      return;
    }
    
    const locale = seller.preferredLocale || 'ar';
    const templateData = templates[template][locale];
    
    if (!templateData) {
      logger.error('[SellerNotification] Template not found', { template, locale });
      return;
    }
    
    // Send email
    const subject = templateData.subject;
    const body = typeof templateData.body === 'function' 
      ? (templateData.body as (_d: Record<string, unknown>) => string)(data) 
      : templateData.body;
    await sendEmail(seller.email, subject, body);
    
    // Send SMS if phone exists
    if (seller.phone && templateData.sms) {
      const smsMessage = typeof templateData.sms === 'function'
        ? (templateData.sms as (_d: Record<string, unknown>) => string)(data)
        : templateData.sms;
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
