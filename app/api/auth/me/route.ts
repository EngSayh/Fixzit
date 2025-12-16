/**
 * Current User Session API Route Handler
 * GET /api/auth/me - Get current authenticated user's session data
 * 
 * Returns user profile, role, and organization info for client-side state management.
 * Always returns 200 status with guest payload for unauthenticated requests to avoid
 * 401 noise in browser console. Used by SWR hooks for session polling.
 * 
 * @module app/api/auth/me/route
 * 
 * @response
 * - authenticated: boolean
 * - user: User object (if authenticated) or null (if guest)
 *   - id: User ID
 *   - email: User email
 *   - name: Display name
 *   - role: User role (admin, user, etc.)
 *   - orgId: Organization ID
 * 
 * @security
 * - Rate limited: 120 requests per minute per IP (high for polling)
 * - No authentication required (graceful guest response)
 * - Returns partial user data only (no sensitive fields)
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
