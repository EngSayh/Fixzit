import { NextRequest } from "next/server";
import { z } from "zod";
import sgMail from "@sendgrid/mail";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { getClientIP } from "@/server/security/headers";
import { logger } from "@/lib/logger";
import { verifySecretHeader } from "@/lib/security/verify-secret-header";
import {
  getSendGridConfig,
  getBaseEmailOptions,
  isSendGridConfigured,
  getTemplateId,
} from "@/config/sendgrid.config";
import { DOMAINS, EMAIL_DOMAINS } from "@/lib/config/domains";

const welcomeEmailSchema = z.object({
  email: z.string().email(),
  errorId: z.string(),
  subject: z.string(),
  registrationLink: z.string().url(),
});

/**
 * @openapi
 * /api/support/welcome-email:
 *   get:
 *     summary: support/welcome-email operations
 *     tags: [support]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */

export async function POST(req: NextRequest) {
  // Rate limiting - reduced to 5 req/min since this sends emails
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 5, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // SECURITY FIX: Require internal API secret for email sending
  // This endpoint should only be called by internal services
  const secretValid = verifySecretHeader(
    req,
    "x-internal-secret",
    process.env.INTERNAL_API_SECRET,
  );
  if (!secretValid) {
    logger.warn("[welcome-email] Unauthorized access attempt", { clientIp });
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  try {
    const body = welcomeEmailSchema.parse(await req.json());

    // Check if email service is configured
    if (!isSendGridConfigured()) {
      return createSecureResponse(
        {
          error:
            "Email service not yet configured. Please integrate SendGrid, AWS SES, or similar service.",
          status: "not_configured",
        },
        501,
        req,
      ); // 501 Not Implemented
    }

    // Create a mock email record in the database (optional)
    // This could be stored in MongoDB for tracking

    // Email template for future use when email service is integrated
    const _emailTemplate = `
🎉 Welcome to Fixzit Enterprise!

Thank you for reporting an issue with our system. We're actively working to resolve it.

**Error ID:** ${body.errorId}
**Reported:** ${new Date().toISOString()}

**Next Steps:**
1. 📝 Your support ticket has been created and assigned to our technical team
2. 🔧 Our developers are investigating the issue
3. 📧 You'll receive updates via email within 24 hours
4. 🎯 Once resolved, you'll get a notification with the fix details

**To Get Started with Fixzit:**
1. Create your account: ${body.registrationLink}
2. Complete your profile setup
3. Access the full Fixzit Enterprise platform
4. Track your support tickets in real-time

**Why Choose Fixzit Enterprise?**
- ✅ Complete Facility Management Solution
- ✅ Unified Marketplace Integration
- ✅ Real Estate Management Tools
- ✅ Advanced Analytics & Reporting
- ✅ 24/7 Support & Assistance

**Need Immediate Help?**
- Contact our support team: ${EMAIL_DOMAINS.support}
- Visit our help center: ${DOMAINS.primary}/help
- Call us: +966 50 123 4567

Welcome to the Fixzit family! 🚀

Best regards,
The Fixzit Enterprise Team
    `.trim();

    /**
     * SendGrid Email Service Integration
     *
     * ✅ Production-Ready with:
     * - @sendgrid/mail SDK (installed)
     * - Centralized SendGrid configuration
     * - Multiple sender identities support
     * - Dynamic template support
     * - Reply-to configuration
     * - Unsubscribe groups
     * - IP pools for better deliverability
     * - MongoDB tracking for email delivery status
     *
     * @see https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
     * @see /config/sendgrid.config.ts for centralized configuration
     */

    // Initialize SendGrid with API key
    const config = getSendGridConfig();
    sgMail.setApiKey(config.apiKey);

    const emailId = `WEL-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const timestamp = new Date();

    // Check if a dynamic template is configured
    const templateId = getTemplateId("welcome");

    try {
      // Get base email options with configured sender and advanced features
      const baseOptions = getBaseEmailOptions();

      if (templateId) {
        // Use SendGrid Dynamic Template
        await sgMail.send({
          ...baseOptions,
          to: body.email,
          templateId,
          dynamicTemplateData: {
            errorId: body.errorId,
            registrationLink: body.registrationLink,
            subject: body.subject,
            currentYear: new Date().getFullYear(),
            supportEmail: config.replyTo?.email || config.from.email,
          },
          customArgs: {
            emailId,
            errorId: body.errorId,
            type: "welcome_email",
          },
        });
      } else {
        // Use HTML template (legacy/fallback)
        await sgMail.send({
          ...baseOptions,
          to: body.email,
          subject: body.subject,
          html: _emailTemplate,
          text: _emailTemplate.replace(/<[^>]*>/g, ""), // Plain text fallback
          customArgs: {
            emailId,
            errorId: body.errorId,
            type: "welcome_email",
          },
        });
      }

      // Track email in MongoDB
      try {
        const db = await getDatabase();
        const emailsCollection = db.collection(COLLECTIONS.EMAIL_LOGS);

        await emailsCollection.insertOne({
          emailId,
          type: "welcome_email",
          recipient: body.email,
          subject: body.subject,
          errorId: body.errorId,
          registrationLink: body.registrationLink,
          status: "sent",
          sentAt: timestamp,
          provider: "sendgrid",
          metadata: {
            clientIp,
            correlationId:
              req.headers.get("x-correlation-id") || crypto.randomUUID(),
          },
        });

        logger.info("✅ Email sent and logged", {
          emailId,
          recipient: body.email,
          timestamp: timestamp.toISOString(),
        });
      } catch (dbError) {
        // Email sent but logging failed - don't fail the request
        logger.warn("⚠️ Email sent but database logging failed:", { dbError });
      }

      return createSecureResponse(
        {
          success: true,
          message: "Welcome email sent successfully",
          emailId,
          recipient: body.email,
          subject: body.subject,
          sentAt: timestamp.toISOString(),
        },
        200,
        req,
      );
    } catch (sendGridError: unknown) {
      // SendGrid failed - log error and track failure
      const error = sendGridError as Error;
      logger.error(
        "❌ SendGrid error:",
        error instanceof Error ? error.message : "Unknown error",
      );

      try {
        const db = await getDatabase();
        await db.collection(COLLECTIONS.EMAIL_LOGS).insertOne({
          emailId,
          type: "welcome_email",
          recipient: body.email,
          subject: body.subject,
          errorId: body.errorId,
          status: "failed",
          error: error.message,
          failedAt: timestamp,
          provider: "sendgrid",
        });
      } catch {
        // Ignore DB errors during failure logging
      }

      return createSecureResponse(
        {
          error: "Failed to send email",
          message:
            "Email service temporarily unavailable. Please try again later.",
          emailId,
        },
        500,
        req,
      );
    }
  } catch (error) {
    const correlationId =
      req.headers.get("x-correlation-id") || crypto.randomUUID();
    logger.error(
      `[${correlationId}] Welcome email error:`,
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to send welcome email", correlationId },
      500,
      req,
    );
  }
}

// GET method to check welcome email status
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const sp = new URL(req.url).searchParams;
  const email = sp.get("email");

  if (!email) {
    return createSecureResponse(
      { error: "Email parameter required" },
      400,
      req,
    );
  }

  // Check if email service is configured
  if (!isSendGridConfigured()) {
    return createSecureResponse(
      {
        error:
          "Email service not yet configured. Please integrate SendGrid, AWS SES, or similar service.",
        email,
        status: "not_configured",
      },
      501,
      req,
    ); // 501 Not Implemented
  }

  try {
    // Query MongoDB for email delivery status
    const db = await getDatabase();
    const emailsCollection = db.collection(COLLECTIONS.EMAIL_LOGS);

    // PLATFORM-WIDE: internal email logs are global
    const emailRecords = await emailsCollection
      .find({ recipient: email, type: "welcome_email" })
      .sort({ sentAt: -1, failedAt: -1 })
      .limit(10)
      .toArray();

    if (emailRecords.length === 0) {
      return createSecureResponse(
        {
          email,
          status: "no_records_found",
          message: "No welcome emails found for this recipient",
        },
        404,
        req,
      );
    }

    return createSecureResponse(
      {
        email,
        totalEmails: emailRecords.length,
        emails: emailRecords.map((record: Record<string, unknown>) => ({
          emailId: record.emailId,
          subject: record.subject,
          status: record.status,
          sentAt: record.sentAt,
          failedAt: record.failedAt,
          errorId: record.errorId,
          error: record.error,
        })),
      },
      200,
      req,
    );
  } catch (error) {
    logger.error(
      "Error querying email status:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      {
        error: "Failed to query email status",
        email,
      },
      500,
      req,
    );
  }
}
