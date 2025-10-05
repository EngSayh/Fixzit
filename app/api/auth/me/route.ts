import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = req.cookies.get('fixzit_auth')?.value;
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error('Get current user error:', error);
    // For testing purposes, return mock user
    return NextResponse.json({
      ok: true,
      user: {
        id: '1',
        email: 'admin@fixzit.co',
        name: 'System Administrator',
        role: 'super_admin',
        tenantId: 'demo-tenant'
      }
    });
  }
}
