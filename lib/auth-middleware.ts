import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/src/lib/auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser> {
  const authToken = req.cookies.get('fixzit_auth')?.value;
  
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
    name: payload.name || 'User',
    role: payload.role,
    tenantId: payload.tenantId
  };
}

export function requireAbility(action: string) {
  return async (req: NextRequest): Promise<AuthenticatedUser | NextResponse> => {
    try {
      const user = await getSessionUser(req);
      
      // Basic role-based access control
      const rolePermissions: Record<string, string[]> = {
        'SUPER_ADMIN': ['*'],
        'CORPORATE_ADMIN': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'ADMIN': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        'FM_MANAGER': ['CREATE', 'READ', 'UPDATE'],
        'TECHNICIAN': ['READ', 'UPDATE'],
        'TENANT': ['CREATE', 'READ'],
        'VENDOR': ['READ']
      };

      const userPermissions = rolePermissions[user.role] || [];
      
      if (!userPermissions.includes('*') && !userPermissions.includes(action)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return user;
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  };
}