/**
 * @description Resets user password using a valid signed reset token.
 * Validates token, updates password hash, and invalidates the token.
 * @route POST /api/auth/reset-password
 * @access Public - Requires valid password reset token
 * @param {Object} body - token, password, confirmPassword
 * @returns {Object} success: true on password reset
 * @throws {400} If token invalid/expired or passwords don't match
 * @throws {404} If user associated with token not found
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { verifyPasswordResetToken } from "@/lib/auth/passwordReset";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";
import { parseBodySafe } from "@/lib/api/parse-body";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/**
 * Resets user password with token validation
 * - Validates HMAC-signed token
 * - Rate limited to prevent brute force
 * - Requires strong password
 * - Unlocks account on successful reset
 * - Clears login attempts
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    // SECURITY: Use distributed rate limiting (Redis) to prevent cross-instance bypass
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`reset-password:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(req, { logPrefix: "[reset-password]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Validate input
    const parseResult = resetSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { token, password } = parseResult.data;

    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      logger.error("[reset-password] NEXTAUTH_SECRET/AUTH_SECRET not configured", {
        hint: "Set NEXTAUTH_SECRET or AUTH_SECRET env var in Vercel/production",
      });
      return NextResponse.json(
        { error: "Password reset not configured" },
        { status: 500 }
      );
    }

    // Verify the token
    const tokenResult = verifyPasswordResetToken(token, secret);
    if (!tokenResult.ok) {
      logger.warn("[reset-password] Invalid or expired token", {
        reason: tokenResult.reason,
      });
      
      const errorMessages: Record<string, string> = {
        expired: "This password reset link has expired. Please request a new one.",
        signature: "Invalid password reset link. Please request a new one.",
        invalid: "Invalid password reset link. Please request a new one.",
      };
      
      return NextResponse.json(
        { error: errorMessages[tokenResult.reason] || "Invalid reset link" },
        { status: 400 }
      );
    }

    const email = tokenResult.email;

    // SECURITY: Resolve default organization for public auth flow (must exist to enforce tenant isolation)
    const resolvedOrgId =
      process.env.PUBLIC_ORG_ID ||
      process.env.TEST_ORG_ID ||
      process.env.DEFAULT_ORG_ID;
    
    // If no org context, reject the reset request to avoid cross-tenant access
    if (!resolvedOrgId) {
      logger.error("[reset-password] Missing org context - cannot process reset");
      return NextResponse.json(
        { error: "Password reset unavailable. Please contact support." },
        { status: 503 }
      );
    }

    await connectToDatabase();
    // SECURITY FIX: Scope email lookup by orgId to prevent cross-tenant attacks (SEC-001)
    const user = await User.findOne({ orgId: resolvedOrgId, email }).lean();

    if (!user) {
      // Don't reveal if user exists
      logger.warn("[reset-password] User not found for email", { email });
      return NextResponse.json(
        { error: "Unable to reset password. Please try again or contact support." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password and reset security flags
     
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          "security.locked": false,
          "security.lockReason": null,
          "security.loginAttempts": 0,
          "security.lastPasswordChange": new Date(),
        },
      }
    );

    logger.info("[reset-password] Password reset successful", {
      userId: String(user._id),
    });

    return NextResponse.json({
      ok: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    logger.error("[reset-password] Unexpected error", error as Error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to validate token without resetting.
 * Used by the UI to check if token is valid before showing the form.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    
    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { valid: false, error: "Not configured" },
        { status: 500 }
      );
    }

    const tokenResult = verifyPasswordResetToken(token, secret);
    
    if (!tokenResult.ok) {
      return NextResponse.json({
        valid: false,
        error: tokenResult.reason === "expired" 
          ? "This link has expired" 
          : "Invalid reset link",
      });
    }

    return NextResponse.json({
      valid: true,
      email: tokenResult.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
    });
  } catch (error) {
    logger.error("[reset-password/validate] Error", error as Error);
    return NextResponse.json(
      { valid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
