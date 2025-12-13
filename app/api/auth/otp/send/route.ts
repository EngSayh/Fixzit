/**
 * @description Sends OTP code via SMS or Email for passwordless authentication.
 * Supports email, employee ID, or phone number identification.
 * Implements rate limiting and Redis-backed OTP storage with expiry.
 * @route POST /api/auth/otp/send
 * @access Public - Rate limited to prevent abuse
 * @param {Object} body - identifier (email/phone/employeeId), companyCode (optional), deliveryMethod ('sms' | 'email')
 * @returns {Object} success: true, expiresIn: number (seconds)
 * @throws {400} If identifier is invalid or not found
 * @throws {429} If rate limit exceeded (max 5 sends per window)
 */
import { randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  sendOTP,
  isValidSaudiPhone,
  isSMSDevModeEnabled,
  isSmsOperational,
} from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { logCommunication } from "@/lib/communication-logger";
import {
  redisOtpStore,
  redisRateLimitStore,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
} from "@/lib/otp-store";
import { smartRateLimit } from "@/server/security/rateLimit";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  EMPLOYEE_ID_REGEX,
  normalizeCompanyCode,
  buildOtpKey,
  redactIdentifier,
} from "@/lib/otp-utils";
import { isTruthy } from "@/lib/utils/env";
import { redactPhoneNumber } from "@/lib/sms-providers/phone-utils";
import {
  DEMO_EMAILS,
  DEMO_EMPLOYEE_IDS,
  SPECIAL_DEMO_EMAILS,
} from "@/lib/config/demo-users";
import type { ObjectId } from "mongodb";

interface UserDocument {
  _id?: { toString: () => string };
  orgId?: { toString: () => string } | string; // Organization ID for tenant isolation
  email: string;
  username?: string;
  employeeId?: string;
  password?: string;
  isActive?: boolean;
  status?: string;
  __isDemoUser?: boolean;
  contact?: { phone?: string };
  personal?: { phone?: string };
  phone?: string;
  role?: string;
  professional?: { role?: string };
  roles?: string[];
  [key: string]: unknown;
}

// Demo users are now imported from centralized config: @/lib/config/demo-users

const TEST_USERS_FALLBACK_PHONE =
  process.env.NEXTAUTH_TEST_USERS_FALLBACK_PHONE ||
  process.env.TEST_USERS_FALLBACK_PHONE ||
  "";

const DEFAULT_TEST_FORCE_PHONE =
  process.env.NEXTAUTH_TEST_FORCE_PHONE ||
  process.env.TEST_FORCE_PHONE ||
  "";
const FORCE_OTP_PHONE =
  process.env.NEXTAUTH_FORCE_OTP_PHONE || process.env.FORCE_OTP_PHONE || "";

// Note: DEMO_AUTH_ENABLED is defined below with demo password configuration
const OFFLINE_MODE = isTruthy(process.env.ALLOW_OFFLINE_MONGODB);

const TEST_USER_CONFIG = [
  {
    identifier: process.env.TEST_SUPERADMIN_IDENTIFIER,
    password: process.env.TEST_SUPERADMIN_PASSWORD,
    phone: process.env.TEST_SUPERADMIN_PHONE,
    role: "SUPER_ADMIN",
  },
  {
    identifier: process.env.TEST_ADMIN_IDENTIFIER,
    password: process.env.TEST_ADMIN_PASSWORD,
    phone: process.env.TEST_ADMIN_PHONE,
    role: "ADMIN",
  },
  {
    identifier: process.env.TEST_MANAGER_IDENTIFIER,
    password: process.env.TEST_MANAGER_PASSWORD,
    phone: process.env.TEST_MANAGER_PHONE,
    role: "MANAGER",
  },
  {
    identifier: process.env.TEST_TECHNICIAN_IDENTIFIER,
    password: process.env.TEST_TECHNICIAN_PASSWORD,
    phone: process.env.TEST_TECHNICIAN_PHONE,
    role: "TECHNICIAN",
  },
  {
    identifier: process.env.TEST_TENANT_IDENTIFIER,
    password: process.env.TEST_TENANT_PASSWORD,
    phone: process.env.TEST_TENANT_PHONE,
    role: "TENANT",
  },
  {
    identifier: process.env.TEST_VENDOR_IDENTIFIER,
    password: process.env.TEST_VENDOR_PASSWORD,
    phone: process.env.TEST_VENDOR_PHONE,
    role: "VENDOR",
  },
] as const;

// SECURITY: Demo passwords are ONLY for local development/testing
// In production (NODE_ENV=production), demo auth is completely disabled
const DEMO_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_DEMO_LOGIN === "true" || process.env.NODE_ENV === "development");

// SECURITY: Demo passwords are not hardcoded - must be set via environment variable
// If not set, demo auth is effectively disabled even in development
const CUSTOM_DEMO_PASSWORDS = (
  process.env.NEXTAUTH_DEMO_PASSWORDS ||
  process.env.DEMO_LOGIN_PASSWORDS ||
  ""
)
  .split(",")
  .map((pwd) => pwd.trim())
  .filter(Boolean);

// Only use demo passwords if explicitly configured via environment
const DEMO_PASSWORD_WHITELIST = DEMO_AUTH_ENABLED ? CUSTOM_DEMO_PASSWORDS : [];

const isDemoIdentifier = (identifier: string | undefined | null): boolean => {
  if (!identifier) return false;
  if (identifier.includes("@")) {
    return DEMO_EMAILS.has(identifier.toLowerCase());
  }
  return DEMO_EMPLOYEE_IDS.has(identifier.toUpperCase());
};

const matchesDemoPassword = (password: string): boolean => {
  if (!DEMO_AUTH_ENABLED) return false;
  return DEMO_PASSWORD_WHITELIST.some((allowed) => password === allowed);
};

const buildDemoUser = (
  identifier: string,
  loginType: "personal" | "corporate",
  companyCode?: string | null,
) => {
  const normalizedEmail =
    loginType === "personal"
      ? identifier.toLowerCase()
      : `${identifier.toLowerCase()}@demo.fixzit`;

  return {
    _id: `demo-${randomUUID()}`,
    email: normalizedEmail,
    username:
      loginType === "personal" ? normalizedEmail.split("@")[0] : identifier,
    employeeId: loginType === "corporate" ? identifier : undefined,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    isActive: true,
    ...(TEST_USERS_FALLBACK_PHONE
      ? {
          contact: { phone: TEST_USERS_FALLBACK_PHONE },
          personal: { phone: TEST_USERS_FALLBACK_PHONE },
        }
      : {}),
    professional: { role: "SUPER_ADMIN" },
    code: companyCode ?? "DEMO-ORG",
    __isDemoUser: true,
  };
};

const buildTestUser = (
  identifier: string,
  loginType: "personal" | "corporate",
  role: string,
  phone?: string,
  companyCode?: string | null,
) => {
  const normalizedEmail =
    loginType === "personal"
      ? identifier.toLowerCase()
      : `${identifier.toLowerCase()}@test.fixzit`;

  return {
    _id: randomBytes(12).toString("hex"),
    email: normalizedEmail,
    username:
      loginType === "corporate" ? identifier : normalizedEmail.split("@")[0],
    employeeId: loginType === "corporate" ? identifier : undefined,
    role,
    status: "ACTIVE",
    isActive: true,
    contact: { phone: phone ?? TEST_USERS_FALLBACK_PHONE },
    personal: { phone: phone ?? TEST_USERS_FALLBACK_PHONE },
    professional: { role },
    code: companyCode ?? "TEST-ORG",
    __isDemoUser: true,
    __isTestUser: true,
  };
};

const resolveTestUser = (
  identifier: string,
  password: string | undefined,
  loginType: "personal" | "corporate",
  companyCode?: string | null,
) => {
  if (!password) {
    return null;
  }
  const normalized =
    loginType === "personal"
      ? identifier.toLowerCase()
      : identifier.toUpperCase();
  const normalizedCompanyCode = normalizeCompanyCode(
    companyCode || process.env.TEST_COMPANY_CODE,
  );
  for (const config of TEST_USER_CONFIG) {
    if (!config.identifier || !config.password) continue;
    const configIdentifier =
      loginType === "personal"
        ? config.identifier.toLowerCase()
        : config.identifier.toUpperCase();
    const configCompanyCode = normalizeCompanyCode(
      (config as { companyCode?: string }).companyCode ||
        process.env.TEST_COMPANY_CODE,
    );
    const companyCodeMatches =
      loginType === "corporate"
        ? !configCompanyCode ||
          !normalizedCompanyCode ||
          configCompanyCode === normalizedCompanyCode
        : true;
    if (
      normalized === configIdentifier &&
      password === config.password &&
      companyCodeMatches
    ) {
      return buildTestUser(
        normalized,
        loginType,
        config.role,
        config.phone,
        normalizedCompanyCode ?? configCompanyCode,
      );
    }
  }
  return null;
};

// Validation schema
const SendOTPSchema = z.object({
  identifier: z.string().trim().min(1, "Email, phone, or employee number is required"),
  password: z.string().trim().optional(),
  companyCode: z.string().trim().optional(),
  deliveryMethod: z.enum(["sms", "email"]).default("sms"),
});

// Generate random OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Resolve orgId from organization code to enforce tenant scoping for corporate logins
async function resolveOrgIdFromCompanyCode(
  companyCode: string,
): Promise<string | null> {
  const { Organization } = await import("@/server/models/Organization");
  const org = await Organization.findOne({ code: companyCode })
    .select({ _id: 1, orgId: 1 })
    .lean<{
      _id?: ObjectId;
      orgId?: string;
    }>()
    .catch(() => null);

  if (!org) return null;
  const orgId = org.orgId || org._id?.toString();
  return orgId ?? null;
}

// Check rate limit (ASYNC for multi-instance Redis support)
async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  // Use atomic Redis increment for distributed rate limiting
  return redisRateLimitStore.increment(identifier, MAX_SENDS_PER_WINDOW, RATE_LIMIT_WINDOW_MS);
}

/**
 * POST /api/auth/otp/send
 *
 * Send OTP via SMS for login verification
 *
 * Request Body:
 * - identifier: Email, phone, or employee number
 * - password: User password (for authentication; optional for phone-only OTP when allowed)
 *
 * Response:
 * - 200: OTP sent successfully (includes phone last 4 digits for UI)
 * - 400: Invalid credentials or validation error
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const ipRateLimited = enforceRateLimit(request, {
    keyPrefix: "auth:otp-send",
    requests: 10,
    windowMs: 60_000,
  });
  if (ipRateLimited) return ipRateLimited;
  const clientIp =
    (request as unknown as { ip?: string }).ip ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "otp-ip";
  // SECURITY: Use distributed rate limiting (Redis) to prevent cross-instance bypass
  const rl = await smartRateLimit(`auth:otp-send:${clientIp}`, 5, 300_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const parsed = SendOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { identifier: identifierRaw, password, deliveryMethod } = parsed.data;
    const smsDevMode = isSMSDevModeEnabled();

    // PRODUCTION OTP BYPASS: Allow bypassing OTP for superadmin and test users
    // SECURITY: This should only be enabled with additional security controls (IP allowlisting, etc.)
    const bypassOtpAll = process.env.NEXTAUTH_BYPASS_OTP_ALL === 'true';
    const allowTestUserBypass = process.env.ALLOW_TEST_USER_OTP_BYPASS === 'true';
    
    // Check if this is a known test/demo user that should bypass OTP
    const normalizedIdForCheck = identifierRaw.toLowerCase();
    // SECURITY: Externalize superadmin email to environment variable
    // Uses centralized config from lib/config/demo-users.ts as fallback
    const superadminEmail = (process.env.NEXTAUTH_SUPERADMIN_EMAIL || SPECIAL_DEMO_EMAILS.superadmin).toLowerCase();
    const isSuperadminEmail = normalizedIdForCheck === superadminEmail || 
                              normalizedIdForCheck === process.env.TEST_SUPERADMIN_IDENTIFIER?.toLowerCase();
    const isDemoOrTestUser = DEMO_EMAILS.has(normalizedIdForCheck) || 
                             DEMO_EMPLOYEE_IDS.has(identifierRaw.toUpperCase()) ||
                             TEST_USER_CONFIG.some(c => c.identifier?.toLowerCase() === normalizedIdForCheck);
    
    // Enable OTP bypass for authorized users
    let shouldBypassOtp = (bypassOtpAll && isSuperadminEmail) || 
                            (allowTestUserBypass && isDemoOrTestUser);
    
    // SECURITY: Validate user exists and is ACTIVE before enabling bypass (CodeRabbit critical fix)
    // This prevents bypass tokens for non-existent or disabled accounts
    interface BypassUserData {
      _id: { toString(): string };
      status: string;
      orgId?: string;
    }
    let bypassUser: BypassUserData | null = null;
    if (shouldBypassOtp) {
      await connectToDatabase();
      const { User } = await import("@/server/models/User");
      bypassUser = await User.findOne({ email: normalizedIdForCheck })
        .select("_id status orgId")
        .lean() as BypassUserData | null;
      
      if (!bypassUser || bypassUser.status !== "ACTIVE") {
        logger.warn("[OTP] Bypass rejected - user not found or inactive", {
          identifier: redactIdentifier(identifierRaw),
          userExists: Boolean(bypassUser),
          userStatus: bypassUser?.status,
          clientIp,
        });
        shouldBypassOtp = false;
      }
    }
    
    // SECURITY: Apply rate limit even for bypass-eligible users to prevent enumeration (CodeRabbit review fix)
    if (shouldBypassOtp) {
      const bypassRateLimitKey = `auth:otp-bypass:${normalizedIdForCheck}`;
      const bypassRl = await smartRateLimit(bypassRateLimitKey, 5, 300_000);
      if (!bypassRl.allowed) {
        logger.warn("[OTP] Bypass rate limit exceeded", {
          identifier: redactIdentifier(identifierRaw),
          clientIp,
        });
        return NextResponse.json(
          { success: false, error: "Too many attempts. Please try again later." },
          { status: 429 },
        );
      }
    }
    
    if (shouldBypassOtp) {
      logger.warn("[OTP] OTP bypass enabled for authorized user", {
        identifier: redactIdentifier(identifierRaw),
        isSuperadmin: isSuperadminEmail,
        isDemoOrTest: isDemoOrTestUser,
        clientIp,
      });
      
      // Return success response without sending actual SMS
      // The OTP verify endpoint will also need to handle bypass
      const bypassCode = process.env.NEXTAUTH_BYPASS_OTP_CODE;
      
      // SECURITY: Require explicit bypass code configuration (no weak defaults)
      if (!bypassCode) {
        logger.error("[OTP] Bypass enabled but NEXTAUTH_BYPASS_OTP_CODE not configured", {
          identifier: redactIdentifier(identifierRaw),
          clientIp,
        });
        return NextResponse.json(
          { 
            success: false, 
            error: "OTP bypass not configured. Set NEXTAUTH_BYPASS_OTP_CODE environment variable (minimum 12 characters for production)." 
          },
          { status: 500 },
        );
      }
      
      // SECURITY: Enforce minimum bypass code length in production (12+ chars)
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction && bypassCode.length < 12) {
        logger.error("[OTP] SECURITY: Bypass code too short for production", {
          identifier: redactIdentifier(identifierRaw),
          codeLength: bypassCode.length,
          clientIp,
        });
        return NextResponse.json(
          { 
            success: false, 
            error: `NEXTAUTH_BYPASS_OTP_CODE is too short (${bypassCode.length} chars). Production requires minimum 12 characters for security.` 
          },
          { status: 500 },
        );
      }
      
      // SECURITY: Resolve actual user ID and org from database (CodeRabbit critical fix)
      // bypassUser was already validated above, use its data for proper tenant isolation
      const resolvedBypassUserId = bypassUser!._id.toString();
      const resolvedBypassOrgId = bypassUser!.orgId?.toString() || 
        process.env.PUBLIC_ORG_ID || 
        process.env.DEFAULT_ORG_ID;
      
      if (!resolvedBypassOrgId) {
        logger.error("[OTP] No org context for bypass", { 
          identifier: redactIdentifier(identifierRaw),
          clientIp,
        });
        return NextResponse.json(
          { success: false, error: "Org context required" },
          { status: 500 },
        );
      }
      
      // Store bypass OTP in Redis so verify endpoint can validate it
      const bypassOtpKey = `otp:bypass:${normalizedIdForCheck}`;
      await redisOtpStore.set(bypassOtpKey, {
        otp: bypassCode,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
        userId: resolvedBypassUserId,
        phone: 'BYPASS',
        orgId: resolvedBypassOrgId,
        companyCode: parsed.data.companyCode || 'BYPASS',
        __bypassed: true,
      });
      
      // SECURITY AUDIT: Log bypass usage for security monitoring
      logger.warn("[OTP] SECURITY AUDIT: OTP bypass activated", {
        identifier: redactIdentifier(identifierRaw),
        isSuperadmin: isSuperadminEmail,
        isDemoOrTest: isDemoOrTestUser,
        clientIp,
        timestamp: new Date().toISOString(),
        action: 'OTP_BYPASS_SEND',
      });
      
      return NextResponse.json({
        success: true,
        message: "OTP sent successfully",
        data: {
          phone: "****BYPASS",
          expiresIn: OTP_EXPIRY_MS / 1000,
          attemptsRemaining: MAX_ATTEMPTS,
          // SECURITY: Only expose bypass code in dev mode AND non-production
          ...(smsDevMode && !isProduction ? { devCode: bypassCode, __bypassed: true } : {}),
        },
      });
    }

    // 3. Determine login type (email or employee number)
    const emailOk = z.string().email().safeParse(identifierRaw).success;
    const empUpper = identifierRaw.toUpperCase();
    const empOk = EMPLOYEE_ID_REGEX.test(empUpper);

    let loginIdentifier = "";
    let loginType: "personal" | "corporate";
    const normalizedCompanyCode = normalizeCompanyCode(parsed.data.companyCode);

    if (emailOk) {
      loginIdentifier = identifierRaw.toLowerCase();
      loginType = "personal";
    } else if (empOk) {
      loginIdentifier = empUpper;
      loginType = "corporate";
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid email address or employee number (e.g., EMP001)",
        },
        { status: 400 },
      );
    }

    // Resolve org scope early to build tenant-scoped OTP key
    let orgScopeId: string | null = null;
    const resolvedDefaultOrgId =
      process.env.PUBLIC_ORG_ID ||
      process.env.TEST_ORG_ID ||
      process.env.DEFAULT_ORG_ID;

    if (loginType === "corporate") {
      if (!normalizedCompanyCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Company number is required for corporate login",
          },
          { status: 400 },
        );
      }
      await connectToDatabase();
      const resolvedCompanyOrgId = await resolveOrgIdFromCompanyCode(
        normalizedCompanyCode,
      );

      if (!resolvedCompanyOrgId) {
        logger.warn("[OTP] Invalid company code", {
          identifier: redactIdentifier(loginIdentifier),
          code: normalizedCompanyCode,
        });
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 },
        );
      }

      orgScopeId = resolvedCompanyOrgId;
    } else {
      if (!resolvedDefaultOrgId) {
        logger.error("[OTP] Missing org context for personal login", {
          identifier: redactIdentifier(loginIdentifier),
        });
        return NextResponse.json(
          { success: false, error: "Login temporarily unavailable" },
          { status: 503 },
        );
      }
      orgScopeId = resolvedDefaultOrgId;
    }

    const otpKey = buildOtpKey(loginIdentifier, normalizedCompanyCode, orgScopeId);

    // 4. Check rate limit using normalized identifier + org (ASYNC for multi-instance)
    const rateLimitResult = await checkRateLimit(otpKey);
    if (!rateLimitResult.allowed) {
      logger.warn("[OTP] Rate limit exceeded", { identifier: redactIdentifier(otpKey) });
      return NextResponse.json(
        {
          success: false,
          error: "Too many OTP requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    // 5. Resolve user (test users → skip DB, otherwise perform lookup)
    let user: UserDocument | null = null;
    const testUser = smsDevMode
      ? resolveTestUser(
          loginIdentifier,
          password,
          loginType,
          normalizedCompanyCode,
        )
      : null;

    if (testUser) {
      user = testUser;
    } else {
      await connectToDatabase();
      const { User } = await import("@/server/models/User");
      const bcrypt = await import("bcryptjs");

      if (loginType === "personal") {
        // SECURITY FIX: Scope email lookup by orgId to prevent cross-tenant attacks (SEC-001)
        user = await User.findOne({ orgId: orgScopeId, email: loginIdentifier });
      } else {
        // Scope user lookup by both orgId AND company code for defense in depth
        user = await User.findOne({
          orgId: orgScopeId,
          username: loginIdentifier,
          code: normalizedCompanyCode,
        });
      }

      if (!user && DEMO_AUTH_ENABLED && isDemoIdentifier(loginIdentifier)) {
        user = buildDemoUser(
          loginIdentifier,
          loginType,
          normalizedCompanyCode ?? "DEMO-ORG",
        );
        logger.warn("[OTP] Falling back to demo user profile", {
          identifier: redactIdentifier(loginIdentifier),
        });
      }

      if (!user) {
        logger.warn("[OTP] User not found", {
          identifier: redactIdentifier(loginIdentifier),
          loginType,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Invalid credentials",
          },
          { status: 401 },
        );
      }

      // 6. Verify password via bcrypt (demo users may bypass), unless phone-only OTP is allowed and we're in phone flow
      let isValid = false;
      const hashedPassword =
        typeof user.password === "string" ? user.password : "";

      if (password) {
        if (hashedPassword) {
          try {
            const compareResult = await bcrypt.compare(password, hashedPassword);
            isValid = !!compareResult;
          } catch (compareError) {
            logger.error(
              "[OTP] Password comparison failed",
              compareError as Error,
            );
          }
        }

        const isDemoUserCandidate =
          isDemoIdentifier(loginIdentifier) ||
          isDemoIdentifier(user.email) ||
          isDemoIdentifier(user.username) ||
          isDemoIdentifier(user.employeeId) ||
          Boolean(user.__isDemoUser);

        if (!isValid && isDemoUserCandidate && matchesDemoPassword(password)) {
          isValid = true;
          logger.warn("[OTP] Accepted demo credentials", {
            identifier: redactIdentifier(loginIdentifier),
          });
        }

        if (!isValid) {
          logger.warn("[OTP] Invalid password", { identifier: redactIdentifier(loginIdentifier) });
          return NextResponse.json(
            {
              success: false,
              error: "Invalid credentials",
            },
            { status: 401 },
          );
        }
      }
    }

    const isDemoUser = Boolean(user.__isDemoUser);
    const userOrgId =
      (user as { orgId?: { toString?: () => string } }).orgId?.toString?.() ||
      orgScopeId;

    // 7. Check if user is active
    const isUserActive =
      user.isActive !== undefined ? user.isActive : user.status === "ACTIVE";
    if (!isUserActive) {
      logger.warn("[OTP] Inactive user attempted login", {
        identifier: redactIdentifier(loginIdentifier),
        status: user.status,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Account is not active",
        },
        { status: 403 },
      );
    }

    // 8. Get user's phone number
    let userPhone = user.contact?.phone || user.personal?.phone || user.phone;
    const originalUserPhone = userPhone;

    const isSuperAdmin =
      user.role === "SUPER_ADMIN" ||
      user.professional?.role === "SUPER_ADMIN" ||
      user.roles?.includes?.("SUPER_ADMIN");

    if (!userPhone && isSuperAdmin) {
      const fallbackPhone =
        process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE ||
        process.env.SUPER_ADMIN_FALLBACK_PHONE ||
        "";

      if (fallbackPhone) {
        userPhone = fallbackPhone;
        logger.warn("[OTP] Using fallback phone for super admin", {
          userId: user._id?.toString?.() || loginIdentifier,
        });
      }
    }

    const isDemoUserForPhone = isDemoUser;

    if (!userPhone && TEST_USERS_FALLBACK_PHONE && isDemoUserForPhone) {
      userPhone = TEST_USERS_FALLBACK_PHONE;
      logger.warn("[OTP] Using fallback phone for demo/test user", {
        userId: user._id?.toString?.() || redactIdentifier(loginIdentifier),
        identifier: redactIdentifier(loginIdentifier),
      });
    }

    const forcedPhone =
      FORCE_OTP_PHONE ||
      (smsDevMode && process.env.NODE_ENV !== "production"
        ? DEFAULT_TEST_FORCE_PHONE
        : "");

    if (forcedPhone) {
      userPhone = forcedPhone;
      logger.warn("[OTP] Forcing OTP recipient phone", {
        userId: user._id?.toString?.() || loginIdentifier,
        originalPhoneLast4: originalUserPhone?.slice(-4),
        forcedPhoneLast4: forcedPhone.slice(-4),
      });
    }

    // Phone validation only required for SMS delivery
    if (deliveryMethod === "sms") {
      if (!userPhone) {
        logger.error("[OTP] User has no phone number", {
          userId: user._id?.toString?.() || loginIdentifier,
        });
        return NextResponse.json(
          {
            success: false,
            error: "No phone number registered. Please use email delivery or contact support.",
          },
          { status: 400 },
        );
      }

      // 9. Validate phone number (Saudi format)
      if (!isValidSaudiPhone(userPhone)) {
        logger.error("[OTP] Invalid phone number format", {
          userId: user._id?.toString?.() || loginIdentifier,
          phone: redactPhoneNumber(userPhone),
        });
        return NextResponse.json(
          {
            success: false,
            error: "Invalid phone number format. Please update your profile.",
          },
          { status: 400 },
        );
      }

      // 9a. Fail fast if SMS is not operational (prevents silent OTP loss)
      if (!isSmsOperational()) {
        logger.error("[OTP] SMS provider not configured", {
          userId: user._id?.toString?.() || loginIdentifier,
          phone: redactPhoneNumber(userPhone),
        });
        return NextResponse.json(
          {
            success: false,
            error: "SMS is not configured. Please use email delivery or contact support.",
          },
          { status: 503 },
        );
      }

      // 9b. SECURITY: Per-phone rate limiting to prevent SMS bombing
      // Limits OTP sends to the same phone number regardless of which user account
      const phoneRateLimitKey = `otp-phone:${userPhone}`;
      const phoneRateLimit = await checkRateLimit(phoneRateLimitKey);
      if (!phoneRateLimit.allowed) {
        logger.warn("[OTP] Phone rate limit exceeded", {
          phone: `****${userPhone.slice(-4)}`,
          userId: user._id?.toString?.() || loginIdentifier,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Too many OTP requests to this phone. Please try again later.",
          },
          { status: 429 },
        );
      }
    }

    // Email validation for email delivery
    if (deliveryMethod === "email") {
      if (!user.email) {
        logger.error("[OTP] User has no email address for email delivery", {
          userId: user._id?.toString?.() || loginIdentifier,
        });
        return NextResponse.json(
          {
            success: false,
            error: "No email address registered. Please use SMS delivery or contact support.",
          },
          { status: 400 },
        );
      }

      // Per-email rate limiting to prevent email bombing
      const emailRateLimitKey = `otp-email:${user.email}`;
      const emailRateLimit = await checkRateLimit(emailRateLimitKey);
      if (!emailRateLimit.allowed) {
        logger.warn("[OTP] Email rate limit exceeded", {
          email: `****@${user.email.split("@")[1] || "***"}`,
          userId: user._id?.toString?.() || loginIdentifier,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Too many OTP requests to this email. Please try again later.",
          },
          { status: 429 },
        );
      }
    }

    // 10. Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // 11. Store OTP in Redis for multi-instance support
    // SECURITY: Include orgId in payload for tenant validation during verify (SEC-BLOCKER-001)
    await redisOtpStore.set(otpKey, {
      otp,
      expiresAt,
      attempts: 0,
      userId: user._id?.toString?.() || loginIdentifier,
      phone: userPhone,
      email: user.email,
      orgId: orgScopeId,
      companyCode: normalizedCompanyCode,
      deliveryMethod, // Track which method was used
    });

    // 12. Send OTP via SMS or Email based on deliveryMethod
    let deliveryResult: { success: boolean; error?: string; messageSid?: string; cost?: number; segments?: number };
    let deliveryRecipient: string;
    let maskedRecipient: string;

    if (deliveryMethod === "email") {
      // Email delivery
      const userEmail = user.email;
      if (!userEmail) {
        await redisOtpStore.delete(otpKey);
        logger.error("[OTP] User has no email address", {
          userId: user._id?.toString?.() || loginIdentifier,
        });
        return NextResponse.json(
          {
            success: false,
            error: "No email address registered. Please use SMS or contact support.",
          },
          { status: 400 },
        );
      }

      deliveryRecipient = userEmail;
      const expiryMinutes = Math.floor(OTP_EXPIRY_MS / 60000);
      const emailResult = await sendEmail(
        userEmail,
        "Fixzit Login Verification Code",
        `Your verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this code, please ignore this email.`,
        {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Login Verification</h2>
              <p style="margin: 20px 0; line-height: 1.6; color: #666;">Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #0070f3; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; letter-spacing: 4px;">${otp}</div>
              <p style="margin: 20px 0; line-height: 1.6; color: #666;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
              <p style="margin: 20px 0; line-height: 1.6; color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
            </div>
          `,
        },
      );

      deliveryResult = {
        success: emailResult.success,
        error: emailResult.error,
        messageSid: emailResult.messageId,
      };
      // Mask email: j***@example.com
      const [emailUser, emailDomain] = userEmail.split("@");
      maskedRecipient = emailUser && emailDomain 
        ? `${emailUser.slice(0, 1)}***@${emailDomain}` 
        : "***@***";
    } else {
      // SMS delivery (default)
      // userPhone is guaranteed to be defined here because we validated it earlier
      deliveryRecipient = userPhone!;
      const smsResult = await sendOTP(userPhone!, otp);
      deliveryResult = smsResult;
      // Mask phone: 966****1234
      maskedRecipient = userPhone!.replace(/(\d{3})\d+(\d{4})/, "$1****$2");
    }

    if (!OFFLINE_MODE) {
      const logResult = await logCommunication({
        orgId: userOrgId || undefined, // SECURITY: Include orgId for tenant isolation (SEC-003)
        userId: user._id?.toString?.() || loginIdentifier,
        channel: deliveryMethod === "email" ? "email" : "otp",
        type: "otp",
        recipient: deliveryRecipient,
        subject: "Login verification OTP",
        message: `${deliveryMethod.toUpperCase()} OTP login requested for ${loginIdentifier}`,
        status: deliveryResult.success ? "sent" : "failed",
        errorMessage: deliveryResult.success ? undefined : deliveryResult.error,
        metadata: {
          ...(deliveryMethod === "sms" && userPhone && { phone: userPhone }),
          ...(deliveryMethod === "email" && { email: user.email }),
          otpExpiresAt: new Date(expiresAt),
          otpAttempts: MAX_ATTEMPTS,
          rateLimitRemaining: rateLimitResult.remaining,
          identifier: otpKey,
          ...(deliveryResult.messageSid && { messageId: deliveryResult.messageSid }),
          ...(deliveryResult.cost && { cost: deliveryResult.cost }),
          ...(deliveryResult.segments && { segments: deliveryResult.segments }),
        },
      });

      if (!logResult.success) {
        logger.warn("[OTP] Failed to log communication", {
          error: logResult.error,
        });
      }
    }

    if (!deliveryResult.success) {
      await redisOtpStore.delete(otpKey);
      logger.error(`[OTP] Failed to send ${deliveryMethod.toUpperCase()}`, {
        userId: user._id?.toString?.() || loginIdentifier,
        error: deliveryResult.error,
        deliveryMethod,
        recipient: maskedRecipient,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send OTP via ${deliveryMethod}. Please try again.`,
        },
        { status: 500 },
      );
    }

    logger.info(`[OTP] OTP sent successfully via ${deliveryMethod.toUpperCase()}`, {
      userId: user._id?.toString?.() || redactIdentifier(loginIdentifier),
      identifier: redactIdentifier(otpKey),
      deliveryMethod,
      recipient: maskedRecipient,
    });

    // 13. Return success response (mask recipient)
    const responseData: {
      phone?: string;
      email?: string;
      deliveryMethod: string;
      expiresIn: number;
      attemptsRemaining: number;
      devCode?: string;
    } = {
      deliveryMethod,
      ...(deliveryMethod === "sms" && { phone: maskedRecipient }),
      ...(deliveryMethod === "email" && { email: maskedRecipient }),
      expiresIn: OTP_EXPIRY_MS / 1000, // seconds
      attemptsRemaining: MAX_ATTEMPTS,
    };

    // SECURITY FIX: Only expose OTP code in dev mode when NOT in production
    // and when SMS_DEV_MODE is explicitly enabled
    // This prevents accidental OTP exposure in staging/preview environments
    if (smsDevMode && process.env.NODE_ENV === "development") {
      responseData.devCode = otp;
      logger.warn("[OTP] Dev code included in response - development only", {
        identifier: redactIdentifier(otpKey),
      });
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      data: responseData,
    });
  } catch (error) {
    // Enhanced error logging for production debugging - pass Error object for stack trace capture
    logger.error("[OTP] Send OTP error", error as Error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error context for production debugging
    logger.error("[OTP] Detailed error context", {
      errorName,
      errorMessage,
      stack: errorStack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    });
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        // Only include error hint in non-production environments (security fix from PR #436 feedback)
        ...(process.env.NODE_ENV !== "production" && { 
          errorHint: errorName === "MongooseError" || errorMessage.includes("MongoDB") 
            ? "database_connection" 
            : errorName === "MONGO_DISABLED_FOR_BUILD"
            ? "build_mode"
            : "unknown",
          debug: { name: errorName, message: errorMessage }
        }),
      },
      { status: 500 },
    );
  }
}
