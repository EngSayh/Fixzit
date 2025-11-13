import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * GET /api/auth/me
 * Returns the current authenticated user's session data
 * Used by ClientLayout and other components for auth state management
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return user data from session
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        orgId: session.user.orgId,
        permissions: session.user.permissions,
        isSuperAdmin: session.user.isSuperAdmin,
      }
    });
  } catch (error) {
    console.error('[/api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
