import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  otpStore,
  MAX_ATTEMPTS,
  otpSessionStore,
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

// Validation schema
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

  try {
    // 1. Parse and validate request body
    const body = await request.json();
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

    const otpKey = buildOtpKey(
      loginIdentifier,
      empOk ? normalizedCompanyCode : null,
    );

    // 3. Retrieve OTP data from store
    const otpData = otpStore.get(otpKey);

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

    // 4. Check if OTP expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(otpKey);
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
      otpStore.delete(otpKey);
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
    });

    // 8. Clean up OTP from store
    otpStore.delete(otpKey);

    // 9. Generate temporary OTP login session token (server-side store, not user-modifiable)
    const sessionToken = randomBytes(32).toString("hex");
    otpSessionStore.set(sessionToken, {
      userId: otpData.userId,
      identifier: otpKey,
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

    const accessToken = jwt.sign(
      { sub: otpData.userId },
      secret,
      { expiresIn: ACCESS_TTL_SECONDS },
    );
    const refreshToken = jwt.sign(
      { sub: otpData.userId },
      secret,
      { expiresIn: REFRESH_TTL_SECONDS },
    );

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
