import { randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { sendOTP, isValidSaudiPhone, isSMSDevModeEnabled } from "@/lib/sms";
import { logCommunication } from "@/lib/communication-logger";
import {
  otpStore,
  rateLimitStore,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
} from "@/lib/otp-store";
import { rateLimit } from "@/server/security/rateLimit";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  EMPLOYEE_ID_REGEX,
  normalizeCompanyCode,
  buildOtpKey,
} from "@/lib/otp-utils";

interface UserDocument {
  _id?: { toString: () => string };
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

const DEMO_EMAILS = new Set([
  "superadmin@fixzit.co",
  "admin@fixzit.co",
  "manager@fixzit.co",
  "tenant@fixzit.co",
  "vendor@fixzit.co",
  "corp.admin@fixzit.co",
  "property.manager@fixzit.co",
  "dispatcher@fixzit.co",
  "supervisor@fixzit.co",
  "technician@fixzit.co",
  "vendor.admin@fixzit.co",
  "vendor.tech@fixzit.co",
  "tenant@fixzit.co",
  "owner@fixzit.co",
  "finance@fixzit.co",
  "hr@fixzit.co",
  "helpdesk@fixzit.co",
  "auditor@fixzit.co",
]);

const DEMO_EMPLOYEE_IDS = new Set([
  "EMP001",
  "EMP002",
  "SA001",
  "SA-001",
  "SUPER-001",
  "MGR-001",
  "TENANT-001",
  "VENDOR-001",
]);

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
const OFFLINE_MODE = process.env.ALLOW_OFFLINE_MONGODB === "true";

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
  password: string,
  loginType: "personal" | "corporate",
  companyCode?: string | null,
) => {
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
});

// Generate random OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check rate limit
function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || now > limit.resetAt) {
    // Reset rate limit
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_SENDS_PER_WINDOW - 1 };
  }

  if (limit.count >= MAX_SENDS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  limit.count += 1;
  return { allowed: true, remaining: MAX_SENDS_PER_WINDOW - limit.count };
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
  const clientIp = request.headers.get("x-forwarded-for") || "otp-ip";
  const rl = rateLimit(`auth:otp-send:${clientIp}`, 5, 300_000);
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

    const { identifier: identifierRaw, password } = parsed.data;
    const smsDevMode = isSMSDevModeEnabled();

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

    if (loginType === "corporate" && !normalizedCompanyCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Company number is required for corporate login",
        },
        { status: 400 },
      );
    }

    const otpKey = buildOtpKey(loginIdentifier, normalizedCompanyCode);

    // 4. Check rate limit using normalized identifier
    const rateLimitResult = checkRateLimit(otpKey);
    if (!rateLimitResult.allowed) {
      logger.warn("[OTP] Rate limit exceeded", { identifier: otpKey });
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
        user = await User.findOne({ email: loginIdentifier });
      } else {
        user = await User.findOne({
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
          identifier: loginIdentifier,
        });
      }

      if (!user) {
        logger.warn("[OTP] User not found", {
          identifier: loginIdentifier,
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
            identifier: loginIdentifier,
          });
        }

        if (!isValid) {
          logger.warn("[OTP] Invalid password", { identifier: loginIdentifier });
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

    // 7. Check if user is active
    const isUserActive =
      user.isActive !== undefined ? user.isActive : user.status === "ACTIVE";
    if (!isUserActive) {
      logger.warn("[OTP] Inactive user attempted login", {
        identifier: loginIdentifier,
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
        userId: user._id?.toString?.() || loginIdentifier,
        identifier: loginIdentifier,
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

    if (!userPhone) {
      logger.error("[OTP] User has no phone number", {
        userId: user._id?.toString?.() || loginIdentifier,
      });
      return NextResponse.json(
        {
          success: false,
          error: "No phone number registered. Please contact support.",
        },
        { status: 400 },
      );
    }

    // 9. Validate phone number (Saudi format)
    if (!isValidSaudiPhone(userPhone)) {
      logger.error("[OTP] Invalid phone number format", {
        userId: user._id?.toString?.() || loginIdentifier,
        phone: userPhone,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format. Please update your profile.",
        },
        { status: 400 },
      );
    }

    // 10. Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // 11. Store OTP (in production, use Redis or database)
    otpStore.set(otpKey, {
      otp,
      expiresAt,
      attempts: 0,
      userId: user._id?.toString?.() || loginIdentifier,
      phone: userPhone,
      companyCode: normalizedCompanyCode,
    });

    // 12. Send OTP via SMS
    const smsResult = await sendOTP(userPhone, otp);

    if (!OFFLINE_MODE) {
      const logResult = await logCommunication({
        userId: user._id?.toString?.() || loginIdentifier,
        channel: "otp",
        type: "otp",
        recipient: userPhone,
        subject: "Login verification OTP",
        message: `SMS OTP login requested for ${loginIdentifier}`,
        status: smsResult.success ? "sent" : "failed",
        errorMessage: smsResult.success ? undefined : smsResult.error,
        metadata: {
          phone: userPhone,
          otpExpiresAt: new Date(expiresAt),
          otpAttempts: MAX_ATTEMPTS,
          rateLimitRemaining: rateLimitResult.remaining,
          identifier: otpKey,
        },
      });

      if (!logResult.success) {
        logger.warn("[OTP] Failed to log communication", {
          error: logResult.error,
        });
      }
    }

    if (!smsResult.success) {
      otpStore.delete(otpKey);
      logger.error("[OTP] Failed to send SMS", {
        userId: user._id?.toString?.() || loginIdentifier,
        error: smsResult.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send OTP. Please try again.",
        },
        { status: 500 },
      );
    }

    logger.info("[OTP] OTP sent successfully", {
      userId: user._id?.toString?.() || loginIdentifier,
      identifier: otpKey,
      phone: userPhone.slice(-4),
    });

    // 13. Return success response (mask phone number)
    const maskedPhone = userPhone.replace(/(\d{3})\d+(\d{4})/, "$1****$2");

    const responseData: {
      phone: string;
      expiresIn: number;
      attemptsRemaining: number;
      devCode?: string;
    } = {
      phone: maskedPhone,
      expiresIn: OTP_EXPIRY_MS / 1000, // seconds
      attemptsRemaining: MAX_ATTEMPTS,
    };

    // SECURITY FIX: Only expose OTP code in dev mode when NOT in production
    // and when SMS_DEV_MODE is explicitly enabled
    // This prevents accidental OTP exposure in staging/preview environments
    if (smsDevMode && process.env.NODE_ENV === "development") {
      responseData.devCode = otp;
      logger.warn("[OTP] Dev code included in response - development only", {
        identifier: otpKey,
      });
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      data: responseData,
    });
  } catch (error) {
    logger.error("[OTP] Send OTP error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
