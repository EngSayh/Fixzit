import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { verifyPasswordResetToken } from "@/lib/auth/passwordReset";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";
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
 * Password reset confirmation endpoint.
 * 
 * SECURITY:
 * - Validates HMAC-signed token
 * - Rate limited to prevent brute force
 * - Requires strong password
 * - Unlocks account on successful reset
 * - Clears login attempts
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    const clientIp = getClientIP(req);
    const rl = rateLimit(`reset-password:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    
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

    // SECURITY: Resolve default organization for public auth flow
    // Password resets should be scoped to the default public org
    // STRICT v4.1 FIX: In production, ONLY PUBLIC_ORG_ID is allowed to prevent
    // password reset attacks targeting users in TEST/DEFAULT orgs (cross-tenant attack vector)
    const resolvedOrgId =
      process.env.PUBLIC_ORG_ID ||
      (process.env.NODE_ENV !== "production" && (process.env.TEST_ORG_ID || process.env.DEFAULT_ORG_ID));
    
    // In production, if no PUBLIC_ORG_ID, reject the reset request
    if (!resolvedOrgId && process.env.NODE_ENV === "production") {
      logger.error("[reset-password] PUBLIC_ORG_ID not configured in production - cannot process reset");
      return NextResponse.json(
        { error: "Password reset unavailable. Please contact support." },
        { status: 500 }
      );
    }

    await connectToDatabase();
    // SECURITY FIX: Scope email lookup by orgId to prevent cross-tenant attacks (SEC-001)
    const user = resolvedOrgId
      ? await User.findOne({ orgId: resolvedOrgId, email })
      : await User.findOne({ email }); // Fallback if no orgId configured (dev mode)

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
    logger.error("[reset-password] Unexpected error", { error });
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
    logger.error("[reset-password/validate] Error", { error });
    return NextResponse.json(
      { valid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
