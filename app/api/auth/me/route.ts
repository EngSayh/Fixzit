/**
 * @description Returns the current authenticated user's session data.
 * Provides user profile, role, and organization info for client-side state.
 * Returns guest payload for unauthenticated requests to avoid 401 noise.
 * @route GET /api/auth/me
 * @access Public - Returns different payload based on auth state
 * @returns {Object} authenticated: boolean, user: { id, email, name, role, orgId } | null
 */
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
export async function GET() {
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
