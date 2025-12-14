/**
 * @description Initiates password reset flow by sending reset email.
 * Generates a stateless HMAC-SHA256 signed token valid for 1 hour.
 * Always returns success to prevent email enumeration attacks.
 * @route POST /api/auth/forgot-password
 * @access Public - Rate limited to 5 requests per 15 minutes per IP
 * @param {Object} body - email, locale (en|ar)
 * @returns {Object} success: true (always returns success)
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Config } from "@/lib/config/constants";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { signPasswordResetToken, passwordResetLink } from "@/lib/auth/passwordReset";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";
import { parseBodySafe } from "@/lib/api/parse-body";

export const runtime = "nodejs";

/**
 * Zod schema for forgot-password request body
 */
const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").transform((v) => v.trim().toLowerCase()),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

type _ForgotPasswordBody = z.infer<typeof ForgotPasswordSchema>;
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    // SECURITY: Use distributed rate limiting (Redis) to prevent cross-instance bypass
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`forgot-password:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      // Return success even when rate limited to prevent enumeration
      return NextResponse.json({ 
        ok: true, 
        message: "If an account exists with this email, a reset link has been sent." 
      });
    }

    const { data: rawBody, error: parseError } = await parseBodySafe(req, { logPrefix: "[forgot-password]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = ForgotPasswordSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    const { email, locale } = parsed.data;

    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      logger.error("[forgot-password] NEXTAUTH_SECRET/AUTH_SECRET not configured", {
        hint: "Set NEXTAUTH_SECRET or AUTH_SECRET env var in Vercel/production",
      });
      return NextResponse.json(
        { error: "Password reset not configured" },
        { status: 500 }
      );
    }

    // SECURITY: Resolve default organization for public auth flow (must exist to enforce tenant isolation)
    const resolvedOrgId =
      process.env.PUBLIC_ORG_ID ||
      process.env.TEST_ORG_ID ||
      process.env.DEFAULT_ORG_ID;

    // Always return success to prevent email enumeration
    const successResponse = { 
      ok: true, 
      message: "If an account exists with this email, a reset link has been sent." 
    };
    
    // STRICT v4.1 FIX: If no org context, disable flow to avoid cross-tenant reset attempts
    if (!resolvedOrgId) {
      logger.error("[forgot-password] Missing org context - password reset disabled", {
        severity: "ops_critical",
        action: "Set PUBLIC_ORG_ID/TEST_ORG_ID/DEFAULT_ORG_ID env var to enable password resets",
      });
      // Return 503 Service Unavailable to surface the issue to ops/monitoring
      // Message stays generic to prevent user enumeration
      return NextResponse.json(
        { ok: false, message: "Password reset temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    await connectToDatabase();
    // SECURITY FIX: Scope email lookup by orgId to prevent cross-tenant attacks (SEC-001)
    const user = await User.findOne({ orgId: resolvedOrgId, email }).lean();

    if (!user) {
      // PII redacted per SEC-029
      logger.info("[forgot-password] Reset requested for non-existent email");
      return NextResponse.json(successResponse);
    }

    // Check if account is locked
    const security = (user as { security?: { locked?: boolean } }).security;
    if (security?.locked) {
      // PII redacted per SEC-029
      logger.warn("[forgot-password] Reset requested for locked account");
      // Still return success to prevent enumeration
      return NextResponse.json(successResponse);
    }

    // Generate password reset token
    const token = signPasswordResetToken(email, secret);
    // SECURITY: Ensure VERCEL_URL has https:// scheme for production
    const vercelUrl = process.env.VERCEL_URL;
    const normalizedVercelUrl = vercelUrl 
      ? (vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`)
      : undefined;
    const origin =
      Config.app.url ||
      normalizedVercelUrl ||
      req.nextUrl.origin;
    const resetLink = passwordResetLink(origin, token);

    // Determine locale (already destructured from parsed.data)
    const userName = (user as { personal?: { firstName?: string } }).personal?.firstName || 
                     (user as { name?: string }).name || 
                     email.split("@")[0];

    // Localized email content
    const emailContent = locale === "ar" ? {
      subject: "إعادة تعيين كلمة المرور - Fixzit",
      body: `مرحباً ${userName}،\n\nلقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في Fixzit.\n\nاضغط على الرابط أدناه لإعادة تعيين كلمة المرور:\n\n${resetLink}\n\nهذا الرابط صالح لمدة ساعة واحدة.\n\nإذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.\n\nمع أطيب التحيات،\nفريق Fixzit`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
          <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">إعادة تعيين كلمة المرور</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">مرحباً ${userName}،</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              لقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في Fixzit.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                إعادة تعيين كلمة المرور
              </a>
            </div>
            <p style="color: #999; font-size: 12px; line-height: 1.6;">
              هذا الرابط صالح لمدة ساعة واحدة. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Fixzit</p>
          </div>
        </div>
      `,
    } : {
      subject: "Password Reset Request - Fixzit",
      body: `Hello ${userName},\n\nWe received a request to reset your Fixzit account password.\n\nClick the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.\n\nBest regards,\nThe Fixzit Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              We received a request to reset your Fixzit account password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 12px; line-height: 1.6;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Fixzit</p>
          </div>
        </div>
      `,
    };

    // Send password reset email
    const emailResult = await sendEmail(email, emailContent.subject, emailContent.body, {
      html: emailContent.html,
    });

    if (emailResult.success) {
      // PII redacted per SEC-029 - only log messageId
      logger.info("[forgot-password] Reset email sent", {
        messageId: emailResult.messageId,
      });
    } else if (emailResult.error?.includes("not configured")) {
      // PII redacted per SEC-029
      logger.warn("[forgot-password] SendGrid not configured");
      // In development, include the link for testing
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          ...successResponse,
          link: resetLink, // Only in development
        });
      }
    } else {
      // PII redacted per SEC-029
      logger.error("[forgot-password] Failed to send reset email", {
        error: emailResult.error,
      });
    }

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error("[forgot-password] Unexpected error", error as Error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
