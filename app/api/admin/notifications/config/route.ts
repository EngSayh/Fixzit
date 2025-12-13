/**
 * @description Returns notification service configuration status.
 * Shows which channels (Email, SMS, WhatsApp) are properly configured
 * and their current operational status.
 * @route GET /api/admin/notifications/config
 * @access Private - SUPER_ADMIN only
 * @returns {Object} email: { enabled, configured }, sms: { enabled, configured }, whatsapp: { enabled, configured }
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { Session } from "next-auth";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";

const ADMIN_NOTIFICATIONS_CONFIG_RL_LIMIT = 20;

const enforceNotificationConfigRateLimit = async (
  req: NextRequest,
  session: Session | null,
) => {
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const key = buildOrgAwareRateLimitKey(
    req,
    sessionUser?.orgId ?? null,
    sessionUser?.id ?? null,
  );
  const rl = await smartRateLimit(
    `${key}:admin-notification-config`,
    ADMIN_NOTIFICATIONS_CONFIG_RL_LIMIT,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  return null;
};
export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as Session | null;
    const rateLimited = await enforceNotificationConfigRateLimit(
      request,
      session,
    );
    if (rateLimited) return rateLimited;

    if (!session?.user) {
      await audit({
        actorId: "anonymous",
        actorEmail: "anonymous",
        action: "admin.notifications.config.unauthenticated",
        orgId: "unknown",
        success: false,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      await audit({
        actorId: session.user.id || "unknown",
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.config.forbidden",
        orgId: (session.user as { orgId?: string }).orgId || "unknown",
        success: false,
      });
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN only" },
        { status: 403 },
      );
    }

    // Check SMS configuration (Taqnyat only)
    const smsConfigured = Boolean(
      process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_NAME,
    );

    // Check WhatsApp configuration (Meta WhatsApp Business API)
    const whatsappConfigured = Boolean(
      process.env.WHATSAPP_BUSINESS_API_KEY &&
        process.env.WHATSAPP_PHONE_NUMBER_ID,
    );

    // Check Email configuration
    const emailConfigured = Boolean(
      process.env.SENDGRID_API_KEY || process.env.SMTP_HOST,
    );
    const emailProvider = process.env.SENDGRID_API_KEY
      ? "SendGrid"
      : process.env.SMTP_HOST
        ? "SMTP"
        : undefined;

    const response = {
      sms: {
        configured: smsConfigured,
        provider: "Taqnyat",
        sender: process.env.TAQNYAT_SENDER_NAME,
      },
      whatsapp: {
        configured: whatsappConfigured,
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER_ID,
      },
      email: {
        configured: emailConfigured,
        provider: emailProvider,
      },
    };

    logger.info("[NotificationConfig] Config status retrieved", {
      sms: smsConfigured,
      whatsapp: whatsappConfigured,
      email: emailConfigured,
    });

    await audit({
      actorId: session.user.id || "unknown",
      actorEmail: session.user.email || "unknown",
      actorRole: session.user.role,
      action: "admin.notifications.config.view",
      orgId: (session.user as { orgId?: string }).orgId || "unknown",
      meta: {
        smsConfigured,
        whatsappConfigured,
        emailConfigured,
      },
      success: true,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[NotificationConfig] Error retrieving config", error as Error);
    await audit({
      actorId: "system",
      actorEmail: "system",
      action: "admin.notifications.config.error",
      orgId: "unknown",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to retrieve configuration" },
      { status: 500 },
    );
  }
}
