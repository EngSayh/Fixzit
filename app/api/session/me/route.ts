// app/api/session/me/route.ts - Session information for AI assistant
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    // Get user from JWT token or cookies
    const user = await getCurrentUser(req);

    if (!user) {
      // Return guest session for non-authenticated users
      return NextResponse.json({
        userId: 'guest',
        orgId: 'guest',
        role: 'GUEST',
        name: 'Guest User',
        email: '',
        locale: 'en',
        dir: 'ltr',
        permissions: ['marketplace:read', 'dashboard:read']
      });
    }

    // Determine user's preferred locale and direction
    const acceptLanguage = req.headers.get('accept-language') || 'en';
    const locale = acceptLanguage.startsWith('ar') ? 'ar' : 'en';
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    // Get user permissions based on role
    const permissions = getUserPermissions(user.role);

    return NextResponse.json({
      userId: user.id,
      orgId: user.orgId || 'default',
      role: user.role,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      locale,
      dir,
      permissions
    });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      {
        userId: 'guest',
        orgId: 'guest',
        role: 'GUEST',
        name: 'Guest User',
        email: '',
        locale: 'en',
        dir: 'ltr',
        permissions: ['marketplace:read', 'dashboard:read']
      },
      { status: 200 } // Return guest session instead of error
    );
  }
}

function getUserPermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    'SUPER_ADMIN': [
      'dashboard:manage',
      'work_orders:manage',
      'properties:manage',
      'finance:manage',
      'hr:manage',
      'administration:manage',
      'crm:manage',
      'marketplace:manage',
      'support:manage',
      'compliance:manage',
      'reports:manage',
      'system:manage'
    ],
    'CORP_ADMIN': [
      'dashboard:write',
      'work_orders:write',
      'properties:write',
      'finance:write',
      'hr:write',
      'administration:write',
      'crm:write',
      'marketplace:write',
      'support:write',
      'compliance:write',
      'reports:write',
      'system:read'
    ],
    'MANAGEMENT': [
      'dashboard:write',
      'work_orders:write',
      'properties:write',
      'finance:read',
      'reports:write',
      'support:write'
    ],
    'FINANCE': [
      'dashboard:read',
      'finance:write',
      'reports:write',
      'support:read'
    ],
    'HR': [
      'dashboard:read',
      'hr:write',
      'reports:read',
      'support:read'
    ],
    'CORPORATE_EMPLOYEE': [
      'dashboard:read',
      'work_orders:write',
      'crm:write',
      'support:write',
      'reports:read'
    ],
    'PROPERTY_OWNER': [
      'dashboard:read',
      'properties:write',
      'work_orders:write',
      'finance:read',
      'reports:write',
      'support:read'
    ],
    'TECHNICIAN': [
      'dashboard:read',
      'work_orders:write',
      'support:write',
      'reports:read'
    ],
    'TENANT': [
      'dashboard:read',
      'work_orders:write',
      'properties:read',
      'marketplace:write',
      'support:write',
      'reports:read'
    ],
    'VENDOR': [
      'dashboard:read',
      'work_orders:write',
      'marketplace:write',
      'support:write',
      'reports:read'
    ],
    'BROKER_AGENT': [
      'dashboard:read',
      'properties:write',
      'marketplace:write',
      'support:write',
      'compliance:write',
      'reports:read'
    ],
    'FINANCE_CONTROLLER': [
      'dashboard:read',
      'finance:write',
      'reports:write',
      'compliance:write'
    ],
    'COMPLIANCE_AUDITOR': [
      'dashboard:read',
      'properties:read',
      'finance:read',
      'support:read',
      'compliance:write',
      'reports:write'
    ],
    'GUEST': [
      'marketplace:read',
      'dashboard:read'
    ]
  };

  return rolePermissions[role] || ['marketplace:read'];
}
