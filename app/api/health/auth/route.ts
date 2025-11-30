/**
 * Auth Configuration Health Check Endpoint
 * GET /api/health/auth
 *
 * Returns auth configuration status WITHOUT exposing secrets.
 * Use this to debug 500 errors on /api/auth/session in production.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Ensure this runs in Node.js runtime (not Edge) for consistent behavior
export const runtime = "nodejs";

/**
 * Check if an environment variable is set (without exposing its value)
 */
function checkEnvVar(name: string): { set: boolean; length?: number } {
  const value = process.env[name];
  if (!value) {
    return { set: false };
  }
  return { set: true, length: value.length };
}

export async function GET(_request: NextRequest) {
  try {
    // Check critical auth environment variables
    const authConfig = {
      // Core Auth (CRITICAL)
      NEXTAUTH_SECRET: checkEnvVar("NEXTAUTH_SECRET"),
      NEXTAUTH_URL: checkEnvVar("NEXTAUTH_URL"),
      AUTH_TRUST_HOST: checkEnvVar("AUTH_TRUST_HOST"),
      NEXTAUTH_TRUST_HOST: checkEnvVar("NEXTAUTH_TRUST_HOST"),

      // Database (CRITICAL)
      MONGODB_URI: checkEnvVar("MONGODB_URI"),

      // OAuth (Optional)
      GOOGLE_CLIENT_ID: checkEnvVar("GOOGLE_CLIENT_ID"),
      GOOGLE_CLIENT_SECRET: checkEnvVar("GOOGLE_CLIENT_SECRET"),
      APPLE_CLIENT_ID: checkEnvVar("APPLE_CLIENT_ID"),
      APPLE_CLIENT_SECRET: checkEnvVar("APPLE_CLIENT_SECRET"),

      // Vercel-specific (auto-set by Vercel)
      VERCEL: checkEnvVar("VERCEL"),
      VERCEL_ENV: checkEnvVar("VERCEL_ENV"),
      VERCEL_URL: checkEnvVar("VERCEL_URL"),
    };

    // Determine overall status
    const criticalMissing: string[] = [];

    if (!authConfig.NEXTAUTH_SECRET.set) {
      criticalMissing.push("NEXTAUTH_SECRET");
    }

    // trustHost is required on Vercel
    const isVercel = process.env.VERCEL === "1";
    const trustHostSet =
      authConfig.AUTH_TRUST_HOST.set || authConfig.NEXTAUTH_TRUST_HOST.set;

    if (isVercel && !trustHostSet) {
      criticalMissing.push("AUTH_TRUST_HOST (required for Vercel)");
    }

    if (!authConfig.MONGODB_URI.set) {
      criticalMissing.push("MONGODB_URI");
    }

    // Check if NEXTAUTH_URL or Vercel URL derivation will work
    const hasNextAuthUrl =
      authConfig.NEXTAUTH_URL.set || authConfig.VERCEL_URL.set;
    if (!hasNextAuthUrl) {
      criticalMissing.push("NEXTAUTH_URL (or VERCEL_URL for auto-derivation)");
    }

    const status = criticalMissing.length === 0 ? "healthy" : "unhealthy";

    const response = {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      vercel: {
        isVercel,
        env: process.env.VERCEL_ENV || "not-set",
      },
      config: {
        // Only show set/not-set status, never actual values
        NEXTAUTH_SECRET: authConfig.NEXTAUTH_SECRET.set
          ? `✅ Set (${authConfig.NEXTAUTH_SECRET.length} chars)`
          : "❌ Missing",
        NEXTAUTH_URL: authConfig.NEXTAUTH_URL.set
          ? "✅ Set"
          : authConfig.VERCEL_URL.set
            ? "⚠️ Will derive from VERCEL_URL"
            : "❌ Missing",
        AUTH_TRUST_HOST:
          authConfig.AUTH_TRUST_HOST.set ||
          authConfig.NEXTAUTH_TRUST_HOST.set
            ? "✅ Set"
            : isVercel
              ? "❌ Missing (REQUIRED for Vercel)"
              : "⚠️ Not set (ok for non-Vercel)",
        MONGODB_URI: authConfig.MONGODB_URI.set ? "✅ Set" : "❌ Missing",
        GOOGLE_OAUTH:
          authConfig.GOOGLE_CLIENT_ID.set &&
          authConfig.GOOGLE_CLIENT_SECRET.set
            ? "✅ Configured"
            : authConfig.GOOGLE_CLIENT_ID.set ||
                authConfig.GOOGLE_CLIENT_SECRET.set
              ? "⚠️ Partial (both ID and SECRET required)"
              : "ℹ️ Not configured (credentials-only auth)",
        APPLE_OAUTH:
          authConfig.APPLE_CLIENT_ID.set && authConfig.APPLE_CLIENT_SECRET.set
            ? "✅ Configured"
            : "ℹ️ Not configured",
      },
      criticalIssues:
        criticalMissing.length > 0
          ? criticalMissing
          : ["None - auth should work"],
      recommendations:
        criticalMissing.length > 0
          ? [
              "Add missing environment variables in Vercel Dashboard:",
              "  Settings → Environment Variables → Add for Production",
              "",
              "Critical variables to add:",
              ...criticalMissing.map((v) => `  • ${v}`),
              "",
              "After adding, redeploy the application.",
            ]
          : ["Auth configuration looks good!"],
    };

    logger.info("[Health/Auth] Auth configuration check", {
      status,
      criticalMissing,
    });

    return NextResponse.json(response, {
      status: status === "healthy" ? 200 : 503,
    });
  } catch (error) {
    logger.error("[Health/Auth] Error checking auth config", { error });
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        recommendations: [
          "Check Vercel function logs for detailed error",
          "Ensure all environment variables are set correctly",
        ],
      },
      { status: 500 },
    );
  }
}
