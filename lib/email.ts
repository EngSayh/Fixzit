/**
 * Email Service Utility
 * Wrapper for SendGrid email functionality
 */

import { logger } from "@/lib/logger";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function maskEmailAddress(address: string): string {
  const parts = address.split("@");
  if (parts.length !== 2) return "***";
  const [user, domain] = parts;
  if (!user) return `***@${domain}`;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: {
    from?: string;
    html?: string;
  },
): Promise<EmailResult> {
  const maskedTo = maskEmailAddress(to);
  if (!process.env.SENDGRID_API_KEY) {
    const error = "SendGrid not configured. Missing SENDGRID_API_KEY";
    logger.warn("[Email] Configuration missing", { to: maskedTo });
    return { success: false, error };
  }

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const result = await sgMail.send({
      to,
      from:
        options?.from ||
        process.env.SENDGRID_FROM_EMAIL ||
        EMAIL_DOMAINS.notifications,
      subject,
      text: body,
      html:
        options?.html ||
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #666;">
            ${body.replace(/\n/g, "<br>")}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated notification from Fixzit.<br>
            For support, contact ${EMAIL_DOMAINS.support}
          </p>
        </div>
      `,
    });

    const messageId =
      result?.[0]?.headers?.["x-message-id"] ||
      result?.[0]?.headers?.["X-Message-Id"] ||
      undefined;

    logger.info("[Email] Message sent successfully", {
      to: maskedTo,
      subject,
      messageId,
    });

    return {
      success: true,
      messageId,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Email] Send failed", {
      error: errorMessage,
      to: maskedTo,
      subject,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
