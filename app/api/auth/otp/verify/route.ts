/**
 * @description Verifies OTP code and issues authentication tokens.
 * Creates user session with JWT access and refresh tokens on successful verification.
 * Supports bypass code for development environments.
 * @route POST /api/auth/otp/verify
 * @access Public - Rate limited to prevent brute force
 * @param {Object} body - identifier (email/phone/employeeId), otp (6-digit code), companyCode (optional)
 * @returns {Object} success: true with access/refresh token cookies set
 * @throws {400} If OTP is invalid or expired
 * @throws {401} If max verification attempts exceeded
 * @throws {404} If user not found
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBodySafe } from "@/lib/api/parse-body";
import { randomBytes, randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import {
  redisOtpStore,
  redisOtpSessionStore,
  MAX_ATTEMPTS,
  OTP_SESSION_EXPIRY_MS,
} from "@/lib/otp-store";
import {
  EMPLOYEE_ID_REGEX,
  normalizeCompanyCode,
  buildOtpKey,
  redactIdentifier,
} from "@/lib/otp-utils";
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, REFRESH_TTL_SECONDS } from "@/app/api/auth/refresh/route";
import jwt from "jsonwebtoken";
import { persistRefreshJti } from "@/lib/refresh-token-store";

/**
 * Validation schema for OTP verification request
 */
const VerifyOTPSchema = z.object({
  identifier: z.string().trim().min(1, "Email or employee number is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  companyCode: z.string().trim().optional(),
});

/**
 * POST /api/auth/otp/verify
 *
 * Verify OTP code entered by user
 *
 * Request Body:
 * - identifier: Email or employee number
 * - otp: 6-digit OTP code
 *
 * Response:
 * - 200: OTP verified successfully (includes temporary auth token)
 * - 400: Invalid OTP or expired
 * - 429: Too many attempts
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "auth:otp-verify",
    requests: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  // Extract client IP for audit logging
  const clientIp =
    (request as unknown as { ip?: string }).ip ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "otp-ip";

  try {
    // 1. Parse and validate request body
    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[OTP Verify]" });
    if (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }
    const parsed = VerifyOTPSchema.safeParse(body);

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

    const { identifier: identifierRaw, otp } = parsed.data;

    // 2. Normalize identifier (same logic as send endpoint)
    const emailOk = z.string().email().safeParse(identifierRaw).success;
    const empUpper = identifierRaw.toUpperCase();
    const empOk = EMPLOYEE_ID_REGEX.test(empUpper);

    let loginIdentifier = "";
    const normalizedCompanyCode = normalizeCompanyCode(parsed.data.companyCode);

    if (emailOk) {
      loginIdentifier = identifierRaw.toLowerCase();
    } else if (empOk) {
      loginIdentifier = empUpper;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid identifier format",
        },
        { status: 400 },
      );
    }

    if (empOk && !normalizedCompanyCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Company number is required for corporate login",
        },
        { status: 400 },
      );
    }

    // SECURITY: Resolve orgId to build tenant-scoped OTP key (SEC-BLOCKER-001)
    // Must match the key structure used in OTP send route
    let orgScopeId: string | null = null;
    const resolvedDefaultOrgId =
      process.env.PUBLIC_ORG_ID ||
      process.env.TEST_ORG_ID ||
      process.env.DEFAULT_ORG_ID;

    if (empOk && normalizedCompanyCode) {
      // Corporate login - resolve org from company code
      await connectToDatabase();
      const { Organization } = await import("@/server/models/Organization");
      let org: { _id?: { toString: () => string }; orgId?: string } | null = null;
      try {
        org = await Organization.findOne({ code: normalizedCompanyCode })
          .select({ _id: 1, orgId: 1 })
          .lean<{ _id?: { toString: () => string }; orgId?: string }>();
      } catch (dbErr) {
        // Log DB/infra error and return 503
        logger.error("[OTP Verify] DB error during org lookup", {
          error: dbErr instanceof Error ? dbErr.message : "Unknown",
          code: normalizedCompanyCode,
        });
        return NextResponse.json(
          { success: false, error: "Service temporarily unavailable" },
          { status: 503 },
        );
      }

      if (!org) {
        logger.warn("[OTP Verify] Invalid company code", {
          identifier: redactIdentifier(loginIdentifier),
          code: normalizedCompanyCode,
        });
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 },
        );
      }
      orgScopeId = org.orgId || org._id?.toString() || null;
    } else {
      // Personal login - use default org
      if (!resolvedDefaultOrgId) {
        logger.error("[OTP Verify] Missing org context for personal login", {
          identifier: redactIdentifier(loginIdentifier),
        });
        return NextResponse.json(
          { success: false, error: "Login temporarily unavailable" },
          { status: 503 },
        );
      }
      orgScopeId = resolvedDefaultOrgId;
    }

    const otpKey = buildOtpKey(
      loginIdentifier,
      empOk ? normalizedCompanyCode : null,
      orgScopeId,
    );

    // PRODUCTION OTP BYPASS: Check for bypass OTP first
    // SECURITY: Require explicit bypass code configuration (no weak defaults)
    const bypassCode = process.env.NEXTAUTH_BYPASS_OTP_CODE;
    const bypassEnabled = Boolean(bypassCode && bypassCode.length >= 12);
    
    // Check if this is a superadmin email that can use direct bypass (without prior OTP send)
    const superadminEmail = (process.env.NEXTAUTH_SUPERADMIN_EMAIL || '').toLowerCase();
    const isSuperadminEmail = loginIdentifier.toLowerCase() === superadminEmail;
    
    // Check if this is a bypass verification
    const bypassOtpKey = `otp:bypass:${loginIdentifier.toLowerCase()}`;
    const bypassData = await redisOtpStore.get(bypassOtpKey);
    
    // Allow bypass if:
    // 1. Regular bypass: bypassData exists with __bypassed flag AND otp matches bypassCode
    // 2. Direct superadmin bypass: superadmin email AND otp matches bypassCode (no prior send required)
    //    This handles serverless stateless environment where Redis isn't configured
    const isRegularBypass = bypassEnabled && bypassData && (bypassData as { __bypassed?: boolean }).__bypassed && otp === bypassCode;
    const isDirectSuperadminBypass = bypassEnabled && isSuperadminEmail && otp === bypassCode;
    
    if (isRegularBypass || isDirectSuperadminBypass) {
      // SECURITY: Validate user exists and is ACTIVE before issuing bypass session (CodeRabbit critical fix)
      await connectToDatabase();
      const bypassUser = await User.findOne({ email: loginIdentifier.toLowerCase() })
        .select("_id status orgId")
        .lean() as { _id: { toString(): string }; status: string; orgId?: string } | null;
      
      if (!bypassUser || bypassUser.status !== "ACTIVE") {
        logger.warn("[OTP] Bypass rejected - user inactive or not found", {
          identifier: redactIdentifier(loginIdentifier),
          userExists: Boolean(bypassUser),
          userStatus: bypassUser?.status,
          clientIp,
        });
        await redisOtpStore.delete(bypassOtpKey);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 },
        );
      }
      
      // SECURITY: Validate org context matches to prevent cross-tenant bypass reuse (CodeRabbit review fix)
      // Only check if bypassData exists (not for direct superadmin bypass)
      if (bypassData && bypassData.orgId && orgScopeId && bypassData.orgId !== orgScopeId) {
        logger.warn("[OTP] Bypass org mismatch - potential cross-tenant attack", {
          identifier: redactIdentifier(loginIdentifier),
          storedOrgId: bypassData.orgId,
          requestedOrgId: orgScopeId,
          clientIp,
        });
        await redisOtpStore.delete(bypassOtpKey);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 },
        );
      }
      
      // SECURITY AUDIT: Log bypass verification for security monitoring
      logger.warn("[OTP] SECURITY AUDIT: Bypass OTP verified", {
        identifier: redactIdentifier(loginIdentifier),
        orgId: orgScopeId,
        userId: bypassUser._id.toString(),
        clientIp,
        timestamp: new Date().toISOString(),
        action: 'OTP_BYPASS_VERIFY',
      });
      
      // Clean up bypass OTP
      await redisOtpStore.delete(bypassOtpKey);
      
      // Generate temporary OTP login session token
      // SECURITY: Use validated user data from database, not from bypassData (CodeRabbit critical fix)
      const sessionToken = randomBytes(32).toString("hex");
      await redisOtpSessionStore.set(sessionToken, {
        userId: bypassUser._id.toString(),
        identifier: loginIdentifier,
        orgId: bypassUser.orgId?.toString() || orgScopeId,
        companyCode: bypassData?.companyCode || normalizedCompanyCode,
        expiresAt: Date.now() + OTP_SESSION_EXPIRY_MS,
        __bypassed: true,
      });
      
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully",
        data: {
          otpSession: sessionToken,
          expiresIn: OTP_SESSION_EXPIRY_MS / 1000,
        },
      });
    }

    // 3. Retrieve OTP data from store (ASYNC for multi-instance Redis support)
    const otpData = await redisOtpStore.get(otpKey);

    if (!otpData) {
      logger.warn("[OTP] No OTP found for identifier", {
        identifier: redactIdentifier(otpKey),
      });
      return NextResponse.json(
        {
          success: false,
          error: "OTP not found or expired. Please request a new code.",
        },
        { status: 400 },
      );
    }

    // SECURITY: Validate orgId matches (SEC-BLOCKER-001) and clean up OTP on mismatch
    if (otpData.orgId && orgScopeId && otpData.orgId !== orgScopeId) {
      logger.warn("[OTP] OrgId mismatch - potential cross-tenant attack", {
        identifier: redactIdentifier(otpKey),
        storedOrgId: otpData.orgId,
        requestedOrgId: orgScopeId,
      });
      await redisOtpStore.delete(otpKey);
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // 4. Check if OTP expired
    if (Date.now() > otpData.expiresAt) {
      await redisOtpStore.delete(otpKey);
      logger.warn("[OTP] OTP expired", { identifier: redactIdentifier(otpKey) });
      return NextResponse.json(
        {
          success: false,
          error: "OTP expired. Please request a new code.",
        },
        { status: 400 },
      );
    }

    // 5. Check attempts limit
    if (otpData.attempts >= MAX_ATTEMPTS) {
      await redisOtpStore.delete(otpKey);
      logger.warn("[OTP] Too many attempts", { identifier: redactIdentifier(otpKey) });
      return NextResponse.json(
        {
          success: false,
          error: "Too many incorrect attempts. Please request a new code.",
        },
        { status: 429 },
      );
    }

    // 6. Verify OTP
    if (otp !== otpData.otp) {
      otpData.attempts += 1;
      // STRICT v4.1: Persist attempt increment to Redis for multi-instance consistency
      await redisOtpStore.update(otpKey, otpData);
      const remainingAttempts = MAX_ATTEMPTS - otpData.attempts;

      logger.warn("[OTP] Incorrect OTP", {
        identifier: redactIdentifier(otpKey),
        attempts: otpData.attempts,
        remaining: remainingAttempts,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Incorrect OTP. ${remainingAttempts} attempt(s) remaining.`,
          attemptsRemaining: remainingAttempts,
        },
        { status: 400 },
      );
    }

    // 7. OTP verified successfully
    logger.info("[OTP] OTP verified successfully", {
      userId: otpData.userId,
      identifier: redactIdentifier(otpKey),
      orgId: otpData.orgId || orgScopeId,
    });

    // 8. Clean up OTP from store
    await redisOtpStore.delete(otpKey);

    // 9. Generate temporary OTP login session token (server-side store, not user-modifiable)
    // SECURITY: Include orgId and companyCode for tenant isolation (SEC-BLOCKER-001)
    const sessionToken = randomBytes(32).toString("hex");
    await redisOtpSessionStore.set(sessionToken, {
      userId: otpData.userId,
      identifier: otpKey,
      orgId: otpData.orgId || orgScopeId,
      companyCode: otpData.companyCode || normalizedCompanyCode,
      expiresAt: Date.now() + OTP_SESSION_EXPIRY_MS,
    });

    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Server config error" },
        { status: 500 },
      );
    }

    // STRICT v4.1 FIX: Revalidate user from DB before issuing tokens
    // Prevents issuing tokens to disabled/deleted users or users who changed orgs
    await connectToDatabase();
    const user = await User.findById(otpData.userId)
      .select("status professional.role orgId")
      .lean() as { status: string; professional?: { role?: string }; orgId?: string } | null;

    if (!user || user.status !== "ACTIVE") {
      logger.warn("[OTP] User inactive or not found during token issuance", {
        userId: otpData.userId,
        status: user?.status,
      });
      return NextResponse.json(
        { success: false, error: "Account not active" },
        { status: 401 },
      );
    }

    const userOrgId =
      (user as { orgId?: { toString?: () => string } }).orgId?.toString?.() || null;
    if (orgScopeId && userOrgId && userOrgId !== orgScopeId) {
      logger.warn("[OTP] Org mismatch between OTP session and user record", {
        userId: otpData.userId,
        expectedOrg: orgScopeId,
        userOrgId,
      });
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // STRICT v4.1 FIX: Include role and orgId in access token for downstream RBAC/tenancy
    const accessToken = jwt.sign(
      {
        sub: otpData.userId,
        role: user.professional?.role,
        orgId: user.orgId,
      },
      secret,
      { expiresIn: ACCESS_TTL_SECONDS },
    );
    // Add jti and type for consistency with refresh/post-login routes
    const newJti = randomUUID();
    const refreshToken = jwt.sign(
      {
        sub: otpData.userId,
        type: "refresh",
        jti: newJti,
      },
      secret,
      { expiresIn: REFRESH_TTL_SECONDS },
    );
    await persistRefreshJti(otpData.userId, newJti, REFRESH_TTL_SECONDS);

    const res = NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully",
        data: {
          otpToken: sessionToken,
          userId: otpData.userId,
          expiresIn: OTP_SESSION_EXPIRY_MS / 1000,
          accessToken,
        },
      },
    );
    const secure =
      request.nextUrl.protocol === "https:" ||
      process.env.NODE_ENV === "production";
    res.cookies.set("fxz.otp", sessionToken, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: Math.floor(OTP_SESSION_EXPIRY_MS / 1000),
    });
    res.cookies.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: ACCESS_TTL_SECONDS,
    });
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
    });
    return res;
  } catch (error) {
    logger.error("[OTP] Verify OTP error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
