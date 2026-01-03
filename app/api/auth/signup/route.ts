/**
 * @description Creates a new user account with email/password credentials.
 * Includes email verification flow, password hashing, and atomic user code
 * generation for unique user identification.
 * @route POST /api/auth/signup
 * @access Public - Rate limited to prevent abuse
 * @param {Object} body - firstName, lastName, email, password, confirmPassword, phone, organization
 * @returns {Object} success: true, user: { id, email, verificationLink? }
 * @throws {400} If validation fails (missing fields, password mismatch)
 * @throws {409} If email already registered
 * @throws {429} If rate limit exceeded
 */
import { NextRequest } from "next/server";
import { Config } from "@/lib/config/constants";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { getNextAtomicUserCode } from "@/lib/mongoUtils.server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { smartRateLimit } from "@/server/security/rateLimit";
import {
  zodValidationError,
  rateLimitError,
  duplicateKeyError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { Types } from "mongoose";
import {
  signVerificationToken,
  verificationLink as buildVerificationLink,
} from "@/lib/auth/emailVerification";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { UserRole, UserStatus } from "@/types/user";
import { BRAND_COLORS, NEUTRAL_COLORS } from "@/lib/config/brand-colors";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    fullName: z.string().optional(), // ✅ FIX: Mark fullName as optional
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    companyName: z.string().optional(),
    userType: z.enum(["personal", "corporate", "vendor"]),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    termsAccepted: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions",
      ),
    newsletter: z.boolean().optional(),
    preferredLanguage: z.string().default("en"),
    preferredCurrency: z.string().default("SAR"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: User registration
 *     description: Creates new user account for personal, corporate, or vendor types
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               userType:
 *                 type: string
 *                 enum: [personal, corporate, vendor]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or duplicate user
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    // SECURITY: Use rate limiting to prevent cross-instance bypass
    const rl = await smartRateLimit(`auth-signup:${clientIp}`, 5, 900000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();

    // Parse and validate JSON body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (_jsonError) {
      return zodValidationError({
        issues: [{ path: ["body"], message: "Invalid JSON in request body" }],
      } as z.ZodError);
    }

    const body = signupSchema.parse(requestBody);

    // Resolve default organization - must be explicitly configured
    // SECURITY: Never fallback to arbitrary user's orgId (breaks tenant isolation)
    // STRICT v4.1 FIX: In production, ONLY PUBLIC_ORG_ID is allowed to prevent
    // real users from accidentally landing in TEST/DEFAULT orgs (cross-tenant contamination)
    const resolvedOrgId =
      process.env.PUBLIC_ORG_ID ||
      (process.env.NODE_ENV !== "production" && (process.env.TEST_ORG_ID || process.env.DEFAULT_ORG_ID));

    if (!resolvedOrgId) {
      const errorMsg = process.env.NODE_ENV === "production"
        ? "PUBLIC_ORG_ID is required for signup in production. TEST_ORG_ID and DEFAULT_ORG_ID are blocked in prod to prevent tenant contamination."
        : "Default organization not configured. Set PUBLIC_ORG_ID, TEST_ORG_ID, or DEFAULT_ORG_ID environment variable with a valid ObjectId.";
      throw new Error(errorMsg);
    }

    if (!Types.ObjectId.isValid(resolvedOrgId)) {
      throw new Error(
        `Invalid default organization ID: ${resolvedOrgId}. Must be a valid MongoDB ObjectId.`,
      );
    }

    // 🛑 SECURITY FIX: Public signup MUST NOT be able to set admin roles.
    // The 'userType' from the client is only a hint for data categorization.
    // The 'role' assigned is ALWAYS the lowest-privilege personal user.
    // Admin/Vendor accounts must be created via an internal, authenticated admin endpoint.
    // Use canonical enum to align with STRICT v4.1 role matrix
    const role = UserRole.TENANT;

    // Only store companyName if the user self-identifies as corporate/vendor
    const companyName =
      body.userType === "corporate" || body.userType === "vendor"
        ? body.companyName
        : undefined;

    const normalizedEmail = body.email.toLowerCase();
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // ✅ SECURITY FIX: Pre-check for existing user SCOPED by orgId
    // This prevents cross-tenant information disclosure (SEC-001 pattern)
    const existingUser = await User.findOne({
      orgId: resolvedOrgId,
      email: normalizedEmail,
    }).lean();
    if (existingUser) {
      return duplicateKeyError("An account with this email already exists.");
    }

    // Generate unique user code atomically (race-condition safe)
    const code = await getNextAtomicUserCode();
    const fullName = body.fullName || `${body.firstName} ${body.lastName}`;

    // Get or create organization for new user
    // For public signups, use default PUBLIC org or create personal org
    const defaultOrgId = resolvedOrgId; // Default public org

    // ✅ FIX: Add try/catch around the 'create' to handle race conditions
    let newUser;
    const newUserId = new Types.ObjectId();
    try {
      // Use nested User model schema from @/server/models/User
      newUser = await User.create({
        _id: newUserId,
        orgId: defaultOrgId, // Required by tenant isolation plugin
        code,
        username: code, // Use unique code as username (no more conflicts)
        email: normalizedEmail,
        password: hashedPassword,
        phone: body.phone,
        personal: {
          firstName: body.firstName,
          lastName: body.lastName,
          fullName: fullName,
        },
        professional: {
          role,
        },
        security: {
          lastLogin: new Date(),
          accessLevel: "READ",
          permissions: [],
        },
        preferences: {
          language: body.preferredLanguage || "ar",
          timezone: "Asia/Riyadh",
          notifications: {
            email: true,
            sms: false,
            app: true,
          },
        },
        // STRICT v4.1: Create users as PENDING in production (requires email verification)
        // Non-production environments get ACTIVE status for testing flexibility
        status: process.env.NODE_ENV === "production" && process.env.NEXTAUTH_REQUIRE_EMAIL_VERIFICATION !== "false"
          ? UserStatus.PENDING
          : UserStatus.ACTIVE,
        customFields: {
          companyName,
          termsAccepted: body.termsAccepted,
          newsletter: body.newsletter || false,
          preferredCurrency: body.preferredCurrency || "SAR",
          authProvider: "credentials",
        },
        createdBy: newUserId,
      });
    } catch (dbError: unknown) {
      // 🔒 TYPE SAFETY: Handle MongoDB duplicate key error with type guard
      if (
        dbError &&
        typeof dbError === "object" &&
        "code" in dbError &&
        (dbError as { code: number }).code === 11000
      ) {
        return duplicateKeyError("An account with this email already exists.");
      }
      // Re-throw other unexpected database errors
      throw dbError;
    }

    return createSecureResponse(
      {
        ok: true,
        message: "User created successfully",
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.professional?.role || "VIEWER",
        },
        verification: await (async () => {
          // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
          // MUST align with auth.config.ts to prevent environment drift
          const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
          // STRICT v4.1 FIX: In production, verification infrastructure MUST be available
          // to prevent ACTIVE accounts without verified emails (account integrity risk)
          if (!secret) {
            if (process.env.NODE_ENV === "production") {
              // Production: fail the entire signup to prevent unverified accounts
              // The user was already created above, so we need to roll back
              logger.error("[auth/signup] CRITICAL: NEXTAUTH_SECRET/AUTH_SECRET missing in production - cannot verify email", {
                email: normalizedEmail,
                userId: newUser._id,
                hint: "Set NEXTAUTH_SECRET or AUTH_SECRET env var in Vercel/production",
              });
              // Delete the just-created user to prevent orphaned unverified accounts
              // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Rollback by _id (no org yet)
              await User.deleteOne({ _id: newUser._id });
              throw new Error("Email verification not configured. Signup aborted for production safety.");
            }
            return { sent: false, reason: "not_configured" };
          }
          
          const token = signVerificationToken(normalizedEmail, secret);
          // SECURITY: Ensure VERCEL_URL has https:// scheme for production
          const vercelUrl = process.env.VERCEL_URL;
          const normalizedVercelUrl = vercelUrl 
            ? (vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`)
            : undefined;
          const origin =
            Config.app.url ||
            normalizedVercelUrl ||
            new URL(req.url).origin;
          const verificationLink = buildVerificationLink(origin, token);
          
          // Determine locale from request or body
          const locale = body.preferredLanguage === "ar" ? "ar" : "en";
          const userName = fullName;
          
          // Localized email content
          const emailContent = locale === "ar" ? {
            subject: "مرحباً بك في Fixzit - تأكيد البريد الإلكتروني",
            body: `مرحباً ${userName}،\n\nشكراً لتسجيلك في Fixzit. يرجى تأكيد عنوان بريدك الإلكتروني بالضغط على الرابط أدناه:\n\n${verificationLink}\n\nهذا الرابط صالح لمدة 24 ساعة.\n\nمع أطيب التحيات،\nفريق Fixzit`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
                <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.info}); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">مرحباً بك في Fixzit</h1>
                </div>
                <div style="background: ${NEUTRAL_COLORS.backgroundPage}; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="color: ${NEUTRAL_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">مرحباً ${userName}،</p>
                  <p style="color: ${NEUTRAL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6;">
                    شكراً لتسجيلك في Fixzit. يرجى تأكيد عنوان بريدك الإلكتروني للوصول الكامل إلى حسابك.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                      تأكيد البريد الإلكتروني
                    </a>
                  </div>
                  <p style="color: ${NEUTRAL_COLORS.textPlaceholder}; font-size: 12px; line-height: 1.6;">
                    هذا الرابط صالح لمدة 24 ساعة.
                  </p>
                  <hr style="border: none; border-top: 1px solid ${NEUTRAL_COLORS.border}; margin: 20px 0;" />
                  <p style="color: ${NEUTRAL_COLORS.textPlaceholder}; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Fixzit</p>
                </div>
              </div>
            `,
          } : {
            subject: "Welcome to Fixzit - Verify your email",
            body: `Hello ${userName},\n\nThank you for signing up for Fixzit. Please verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nBest regards,\nThe Fixzit Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.info}); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Fixzit</h1>
                </div>
                <div style="background: ${NEUTRAL_COLORS.backgroundPage}; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="color: ${NEUTRAL_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
                  <p style="color: ${NEUTRAL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6;">
                    Thank you for signing up for Fixzit. Please verify your email address to get full access to your account.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                      Verify Email Address
                    </a>
                  </div>
                  <p style="color: ${NEUTRAL_COLORS.textPlaceholder}; font-size: 12px; line-height: 1.6;">
                    This link expires in 24 hours.
                  </p>
                  <hr style="border: none; border-top: 1px solid ${NEUTRAL_COLORS.border}; margin: 20px 0;" />
                  <p style="color: ${NEUTRAL_COLORS.textPlaceholder}; font-size: 11px; text-align: center;">© ${new Date().getFullYear()} Fixzit</p>
                </div>
              </div>
            `,
          };
          
          // Send verification email
          const emailResult = await sendEmail(normalizedEmail, emailContent.subject, emailContent.body, {
            html: emailContent.html,
          });
          
          if (emailResult.success) {
            logger.info("[auth/signup] Verification email sent", {
              email: normalizedEmail,
              messageId: emailResult.messageId,
            });
            return { sent: true };
          }
          
          // STRICT v4.1 FIX: In production, email verification MUST succeed
          // Roll back user creation if email fails to prevent unverifiable ACTIVE accounts
          const isProd = process.env.NODE_ENV === "production";
          
          // Fallback for development (SendGrid not configured)
          if (emailResult.error?.includes("not configured")) {
            if (isProd) {
              // Production: roll back user - cannot have unverifiable accounts
              logger.error("[auth/signup] CRITICAL: SendGrid not configured in production - rolling back user", {
                email: normalizedEmail,
                userId: newUser._id,
              });
              // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Rollback by _id (no org yet)
              await User.deleteOne({ _id: newUser._id });
              throw new Error("Email service not configured. Signup aborted for production safety.");
            }
            logger.warn("[auth/signup] SendGrid not configured, verification email not sent", {
              email: normalizedEmail,
            });
            return { 
              sent: false, 
              reason: "email_not_configured",
              // Only include link in non-production for testing
              link: verificationLink,
            };
          }
          
          // Email send failed
          if (isProd) {
            // Production: roll back user - cannot have unverifiable accounts
            logger.error("[auth/signup] CRITICAL: Email send failed in production - rolling back user", {
              email: normalizedEmail,
              userId: newUser._id,
              error: emailResult.error,
            });
            // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Rollback by _id (no org yet)
            await User.deleteOne({ _id: newUser._id });
            throw new Error("Verification email failed to send. Signup aborted for production safety.");
          }
          
          // Non-production: log warning but allow user to remain
          logger.error("[auth/signup] Failed to send verification email", {
            email: normalizedEmail,
            error: emailResult.error,
          });
          return { sent: false, reason: "send_failed" };
        })(),
      },
      201,
      req,
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  return createSecureResponse(
    { ok: true, message: "Signup endpoint is active" },
    200,
    req,
  );
}
