import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { sendSMS as sendSMSViaService } from "@/lib/sms";
import { loadTranslations } from "@/lib/i18n/translation-loader";
import { Config } from "@/lib/config/constants";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

// Lazy-load translations
let translations: ReturnType<typeof loadTranslations> | null = null;
function getTranslations() {
  if (!translations) {
    translations = loadTranslations();
  }
  return translations;
}

/**
 * Seller Notification Templates for Souq Marketplace
 */

type Locale = "en" | "ar";

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
      key: "notifications.seller.budgetLow.subject",
      fallback: "Warning: Ad Budget Running Low",
    },
    body: {
      key: "notifications.seller.budgetLow.body",
      fallback:
        'Your ad campaign "{{campaignName}}" has only {{budgetRemaining}} SAR remaining. Consider adding funds to avoid campaign interruption.',
    },
    sms: {
      key: "notifications.seller.budgetLow.sms",
      fallback:
        "Fixzit Alert: Ad budget low - {{budgetRemaining}} SAR remaining. Add funds to continue.",
    },
  },
  BUDGET_DEPLETED: {
    subject: {
      key: "notifications.seller.budgetDepleted.subject",
      fallback: "Alert: Ad Budget Depleted",
    },
    body: {
      key: "notifications.seller.budgetDepleted.body",
      fallback:
        'Your ad campaign "{{campaignName}}" has been paused due to insufficient funds. Add budget to resume advertising.',
    },
    sms: {
      key: "notifications.seller.budgetDepleted.sms",
      fallback:
        "Fixzit Alert: Ad campaign paused - budget depleted. Add funds to resume.",
    },
  },
  REFUND_PROCESSED: {
    subject: {
      key: "notifications.seller.refundProcessed.subject",
      fallback: "Refund Processed Successfully",
    },
    body: {
      key: "notifications.seller.refundProcessed.body",
      fallback:
        "A refund of {{amount}} SAR has been processed for order {{orderId}}. Refund ID: {{refundId}}. The amount will be credited to your account within 5-7 business days.",
    },
    sms: {
      key: "notifications.seller.refundProcessed.sms",
      fallback:
        "Fixzit: Refund of {{amount}} SAR processed for order {{orderId}}.",
    },
  },
  WITHDRAWAL_COMPLETE: {
    subject: {
      key: "notifications.seller.withdrawalComplete.subject",
      fallback: "Withdrawal Completed Successfully",
    },
    body: {
      key: "notifications.seller.withdrawalComplete.body",
      fallback:
        "Your withdrawal of {{amount}} SAR has been processed successfully to account {{iban}}. The funds should arrive within 1-3 business days.",
    },
    sms: {
      key: "notifications.seller.withdrawalComplete.sms",
      fallback: "Fixzit: Withdrawal of {{amount}} SAR completed successfully.",
    },
  },
};

const FALLBACK_LOCALE: Locale = "en";

const translationCatalog: Record<Locale, Record<string, string>> = {
  en: { ...getTranslations().en },
  ar: { ...getTranslations().ar },
};

// Escape regex metacharacters to prevent ReDoS attacks
const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const interpolate = (
  template: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, value]) => {
    const escapedKey = escapeRegExp(key);
    const pattern = new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g");
    return acc.replace(pattern, String(value));
  }, template);
};

const translateTemplate = (
  locale: Locale,
  config: TranslationConfig[keyof TranslationConfig],
  params?: Record<string, string | number>,
) => {
  const dictionary =
    translationCatalog[locale] ?? translationCatalog[FALLBACK_LOCALE];
  const template = dictionary?.[config.key] || config.fallback;
  return interpolate(template, params);
};

/**
 * Get seller details from database
 */
async function getSeller(
  sellerId: string,
  orgId: string,
): Promise<SellerDetails | null> {
  try {
    const db = await getDatabase();
    // 🔐 STRICT v4.1: souq_sellers.orgId is ObjectId; caller may pass string.
    // Use dual-type candidates to match both legacy string and ObjectId storage.
    const { ObjectId } = await import("mongodb");
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];
    const seller = await db
      .collection("souq_sellers")
      .findOne({ sellerId, orgId: { $in: orgCandidates } });

    if (!seller) {
      logger.warn("[SellerNotification] Seller not found", { sellerId });
      return null;
    }

    return {
      email: seller.contactEmail || seller.email,
      phone: seller.contactPhone || seller.phone,
      preferredLocale: seller.preferredLocale || "ar", // Default to Arabic for Saudi market
      businessName: seller.businessName || "Seller",
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SellerNotification] Error fetching seller", error, {
      sellerId,
    });
    return null;
  }
}

/**
 * Send email via SendGrid (if configured)
 */
async function sendEmail(
  to: string,
  subject: string,
  body: string,
  locale: Locale,
): Promise<boolean> {
  // Use getEnv with alias support for Vercel naming conventions
  const sendgridApiKey = getEnv("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    logger.warn("[SellerNotification] SendGrid not configured, skipping email");
    return false;
  }
  const header = translateTemplate(locale, {
    key: "notifications.seller.email.brand",
    fallback: "Fixzit Marketplace",
  });
  const footer = translateTemplate(locale, {
    key: "notifications.seller.email.footer",
    fallback: "This is an automated notification from Fixzit Marketplace.",
  });
  const support = translateTemplate(locale, {
    key: "notifications.seller.email.support",
    fallback: `For support, contact ${Config.souq.sellerSupportEmail}`,
  });

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(sendgridApiKey);

    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || EMAIL_DOMAINS.notifications,
      subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">
            ${header}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #666;">
            ${body.replace(/\n/g, "<br>")}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            ${footer}<br>
            ${support}
          </p>
        </div>
      `,
    });

    logger.info("[SellerNotification] Email sent", { to, subject });
    return true;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SellerNotification] Email send failed", error, {
      to,
      subject,
    });
    return false;
  }
}

/**
 * Send SMS using the centralized SMS service
 */
async function sendSMS(to: string, message: string): Promise<boolean> {
  const result = await sendSMSViaService(to, message);

  if (!result.success) {
    logger.warn("[SellerNotification] SMS send failed", {
      to,
      error: result.error,
    });
    return false;
  }
  return true;
}

/**
 * Send notification to seller
 */
export async function sendSellerNotification<T extends TemplateKey>(
  sellerId: string,
  orgId: string,
  template: T,
  data: TemplatePayloads[T],
): Promise<void> {
  let status: "sent" | "failed" = "failed";
  let locale: Locale | undefined;
  let logged = false;
  let seller: SellerDetails | null = null;
  try {
    if (!orgId) {
      throw new Error("[SellerNotification] orgId is required for tenant isolation");
    }
    seller = await getSeller(sellerId, orgId);

    if (!seller) {
      logger.warn(
        "[SellerNotification] Cannot send notification - seller not found",
        { sellerId },
      );
      return;
    }

    locale = seller.preferredLocale || "ar";
    const templateConfig = templateTranslations[template];
    const params = data as Record<string, string | number>;
    const subject = translateTemplate(locale, templateConfig.subject, params);
    const body = translateTemplate(locale, templateConfig.body, params);
    const emailSent = await sendEmail(seller.email, subject, body, locale);

    const smsSent = seller.phone
      ? await sendSMS(
          seller.phone,
          translateTemplate(locale, templateConfig.sms, params),
        )
      : false;

    // Log notification in database for tracking
    status = emailSent || smsSent ? "sent" : "failed";
    await logNotification(sellerId, orgId, template, data, locale, status);
    logged = true;

    logger.info("[SellerNotification] Notification sent", {
      sellerId,
      template,
      locale,
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SellerNotification] Error sending notification", error, {
      sellerId,
      template,
    });
  } finally {
    // Ensure we still log failed attempts for observability
    const localeToLog = locale ?? seller?.preferredLocale ?? "ar";
    if (localeToLog && !logged) {
      await logNotification(
        sellerId,
        orgId,
        template,
        data,
        localeToLog,
        status,
      );
    }
  }
}

/**
 * Log notification in database for audit trail
 */
async function logNotification(
  sellerId: string,
  orgId: string,
  template: string,
  data: Record<string, unknown>,
  locale: string,
  status: "sent" | "failed",
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection("seller_notifications").insertOne({
      sellerId,
      orgId,
      template,
      data,
      locale,
      sentAt: new Date(),
      status,
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SellerNotification] Error logging notification", error, {
      sellerId,
      template,
    });
  }
}
