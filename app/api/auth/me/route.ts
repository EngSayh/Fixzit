import { NextRequest, NextResponse } from 'next/server';
import { ModuleKey, Role } from '@/src/lib/rbac';

// Mock user data - in real implementation, this would come from your database
const mockUsers: Record<string, {
  role: Role;
  modules?: ModuleKey[];
  orgOverrides?: Partial<Record<ModuleKey, boolean>>;
}> = {
  'superadmin@fixzit.co': {
    role: 'SUPER_ADMIN',
    modules: undefined // Super Admin gets all modules
  },
  'admin@fixzit.co': {
    role: 'CORP_ADMIN',
    modules: undefined, // Will use default permissions
    orgOverrides: {
      'system': false, // Corporate admin cannot access system management
      'budgets': true // Explicitly enabled
    }
  },
  'manager@fixzit.co': {
    role: 'MANAGEMENT',
    modules: undefined // Will use default permissions
  },
  'finance@fixzit.co': {
    role: 'FINANCE',
    modules: undefined // Will use default permissions
  },
  'tenant@fixzit.co': {
    role: 'TENANT',
    modules: undefined // Will use default permissions
  },
  'vendor@fixzit.co': {
    role: 'VENDOR',
    modules: undefined // Will use default permissions
  }
};

/**
 * HTTP GET handler that returns demo authentication information.
 *
 * In production this route would validate a session or JWT and fetch a real user;
 * for demo purposes it:
 * - Returns { user: null, message: 'Static generation mode' } when NEXT_PHASE is "phase-production-build".
 * - Requires an `Authorization` header or `cookie` header and responds 401 if neither is present.
 * - Responds with a mock user payload (id, email, name, role, modules, orgOverrides, tenantId) based on in-file mock data, defaulting to a `GUEST` role.
 * - On unexpected errors returns a 500 JSON error.
 *
 * @returns A NextResponse containing JSON. Successful responses include `{ user: { id, email, name, role, modules, orgOverrides, tenantId } }`. Error responses use `{ error: string }` with appropriate HTTP status codes (401 or 500).
 */
export async function GET(request: NextRequest) {
  try {
    // Handle static generation
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({
        user: null,
        message: 'Static generation mode'
      });
    }

    // In a real implementation, you would validate the session/JWT token here
    // For demo purposes, we'll use a simple approach

    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    // Check if user is authenticated (this is a simplified check)
    // In production, you would validate JWT tokens or session cookies
    if (!authHeader && !cookieHeader) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // For demo purposes, return mock data based on a simple pattern
    // In production, extract user ID from JWT/session and fetch from database
    const demoUser = mockUsers['admin@fixzit.co'] || {
      role: 'GUEST' as Role,
      modules: undefined,
      orgOverrides: undefined
    };

    return NextResponse.json({
      user: {
        id: 'demo-user-id',
        email: 'admin@fixzit.co',
        name: 'Demo Admin',
        role: demoUser.role,
        modules: demoUser.modules,
        orgOverrides: demoUser.orgOverrides,
        tenantId: 'demo-tenant'
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}