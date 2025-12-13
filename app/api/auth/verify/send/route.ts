/**
 * @description Sends email verification link to user's email address.
 * Generates a stateless HMAC-signed verification token.
 * In development, returns the verification link directly.
 * @route POST /api/auth/verify/send
 * @access Public
 * @param {Object} body - email, locale (en|ar)
 * @returns {Object} success: true, verificationLink? (dev only)
 * @throws {400} If email is not provided
 * @throws {404} If user not found
 * @throws {500} If NEXTAUTH_SECRET not configured
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { parseBodySafe } from "@/lib/api/parse-body";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import {
  signVerificationToken,
  verificationLink,
} from "@/lib/auth/emailVerification";
import { sendEmail } from "@/lib/email";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * Zod schema for verify/send request body
 */
const VerifySendSchema = z.object({
  email: z.string().email("Invalid email format").transform((v) => v.trim().toLowerCase()),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

type _VerifyRequestBody = z.infer<typeof VerifySendSchema>;
export async function POST(req: NextRequest) {
  // Rate limit: 10 verification email requests per minute per IP (prevent abuse)
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`auth:verify-send:${clientIp}`, 10, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const { data: rawBody, error: parseError } = await parseBodySafe(req, { logPrefix: "[auth:verify:send]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = VerifySendSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    const body = parsed.data;
  // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
  // MUST align with auth.config.ts to prevent environment drift
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "verification not configured" },
      { status: 500 },
    );
  }

  // SECURITY: Resolve default organization for public auth flow (must exist to enforce tenant isolation)
  const resolvedOrgId =
    process.env.PUBLIC_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.DEFAULT_ORG_ID;

  if (!resolvedOrgId) {
    logger.error("[verify/send] Missing org context - verification disabled", {
      severity: "ops_critical",
      action: "Set PUBLIC_ORG_ID/TEST_ORG_ID/DEFAULT_ORG_ID env var to enable verification emails",
    });
    return NextResponse.json(
      { error: "Verification temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  await connectToDatabase();
  // SECURITY FIX: Scope email lookup by orgId to prevent cross-tenant attacks (SEC-001)
  const user = await User.findOne({ orgId: resolvedOrgId, email: body.email.toLowerCase() }).lean();
  if (!user) {
    // Don't reveal if email exists for security
    return NextResponse.json({ ok: true, message: "Verification email sent if account exists" });
  }
  if ((user as { emailVerifiedAt?: Date }).emailVerifiedAt) {
    return NextResponse.json({ ok: true, message: "already verified" });
  }

  const token = signVerificationToken(body.email.toLowerCase(), secret);
  // SECURITY: Ensure VERCEL_URL has https:// scheme for production
  const vercelUrl = process.env.VERCEL_URL;
  const normalizedVercelUrl = vercelUrl 
    ? (vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`)
    : undefined;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    normalizedVercelUrl ||
    req.nextUrl.origin;
  const link = verificationLink(origin, token);

  // Determine user's preferred locale or use request locale
  const locale = body.locale || "en";
  const userName = (user as { name?: string }).name || body.email.split("@")[0];

  // Localized email content
  const emailContent = locale === "ar" ? {
    subject: "تأكيد بريدك الإلكتروني - Fixzit",
    body: `مرحباً ${userName}،\n\nشكراً لتسجيلك في Fixzit. يرجى تأكيد عنوان بريدك الإلكتروني بالضغط على الرابط أدناه:\n\n${link}\n\nهذا الرابط صالح لمدة 24 ساعة.\n\nإذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.\n\nمع أطيب التحيات،\nفريق Fixzit`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
        <div style="background: linear-gradient(135deg, #0070f3, #00c4cc); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">مرحباً بك في Fixzit</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            مرحباً ${userName}،
          </p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            شكراً لتسجيلك في Fixzit. يرجى تأكيد عنوان بريدك الإلكتروني للوصول الكامل إلى حسابك.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background: #0070f3; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              تأكيد البريد الإلكتروني
            </a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.6;">
            هذا الرابط صالح لمدة 24 ساعة. إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">
            © ${new Date().getFullYear()} Fixzit. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    `,
  } : {
    subject: "Verify your email - Fixzit",
    body: `Hello ${userName},\n\nThank you for signing up for Fixzit. Please verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, you can ignore this email.\n\nBest regards,\nThe Fixzit Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0070f3, #00c4cc); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Fixzit</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hello ${userName},
          </p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Thank you for signing up for Fixzit. Please verify your email address to get full access to your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background: #0070f3; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.6;">
            This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">
            © ${new Date().getFullYear()} Fixzit. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  // Send actual email if SendGrid is configured
  const emailResult = await sendEmail(body.email, emailContent.subject, emailContent.body, {
    html: emailContent.html,
  });

  if (emailResult.success) {
    logger.info("[auth/verify/send] Verification email sent", {
      email: body.email,
      messageId: emailResult.messageId,
    });
    return NextResponse.json({
      ok: true,
      message: "Verification email sent",
    });
  }

  // Fallback: SendGrid not configured, return link for development
  if (emailResult.error?.includes("not configured")) {
    logger.warn("[auth/verify/send] SendGrid not configured, returning link", {
      email: body.email,
    });
    return NextResponse.json({
      ok: true,
      message: "Verification email queued",
      // Only include link in non-production for testing
      ...(process.env.NODE_ENV !== "production" && { link }),
    });
  }

  // Email send failed
  logger.error("[auth/verify/send] Failed to send verification email", {
    email: body.email,
    error: emailResult.error,
  });
  return NextResponse.json(
    { error: "Failed to send verification email. Please try again." },
    { status: 500 }
  );
  } catch (_error) {
    logger.error("[auth/verify/send] Unexpected error", { error: String(_error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
