/**
 * @description Returns the current authenticated user's session data.
 * Provides user profile, role, and organization info for client-side state.
 * Returns guest payload for unauthenticated requests to avoid 401 noise.
 * @route GET /api/auth/me
 * @access Public - Returns different payload based on auth state
 * @returns {Object} authenticated: boolean, user: { id, email, name, role, orgId } | null
 */
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

export async function GET(req: NextRequest) {
  // Rate limit: 120 requests per minute (high for polling)
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`auth:me:${clientIp}`, 120, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const session = await auth();

    if (!session || !session.user) {
      // Return a benign guest payload to avoid 401 noise on public/unauth pages
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 },
      );
    }

    // Return user data from session
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        orgId: session.user.orgId,
        permissions: session.user.permissions,
        isSuperAdmin: session.user.isSuperAdmin,
      },
    });
  } catch (error) {
    logger.error("[/api/auth/me] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
