import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  orgId: string;
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser> {
  // Try to get token from cookie first, then Authorization header
  let authToken = req.cookies.get('fixzit_auth')?.value;
  
  if (!authToken) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    }
  }
  
  if (!authToken) {
    throw new Error('No authentication token found');
  }

  const payload = verifyToken(authToken);
  if (!payload) {
    throw new Error('Invalid authentication token');
  }

  return {
    id: payload.id,
    email: payload.email,
  // name: payload.name || 'User', // Removed, not present in AuthToken
    role: payload.role,
    orgId: payload.orgId
  };
}

export function requireAbility(action: string) {
  return async (req: NextRequest): Promise<AuthenticatedUser | NextResponse> => {
    try {
      const user = await getSessionUser(req);
      
      // Comprehensive role-based access control
      const rolePermissions: Record<string, string[]> = {
        'SUPER_ADMIN': ['*'],
        'CORPORATE_ADMIN': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'ADMIN': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'FM_MANAGER': ['CREATE', 'READ', 'UPDATE'],
        'PROPERTY_MANAGER': ['CREATE', 'READ', 'UPDATE'],
        'TEAM_LEAD': ['CREATE', 'READ', 'UPDATE'],
        'TECHNICIAN': ['READ', 'UPDATE'],
        'MAINTENANCE': ['READ', 'UPDATE'],
        'EMPLOYEE': ['READ', 'UPDATE'],
        'TENANT': ['CREATE', 'READ'],
        'VENDOR': ['READ', 'UPDATE'],
        'FINANCE': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'HR': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'OWNER': ['READ', 'UPDATE'],
        'GUEST': ['READ']
      };

      const userPermissions = rolePermissions[user.role] || [];
      
      if (!userPermissions.includes('*') && !userPermissions.includes(action)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return user;
    } catch (_error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  };
}