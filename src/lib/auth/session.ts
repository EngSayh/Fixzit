// src/lib/auth/session.ts - Session management for AI chatbot
import { NextRequest } from 'next/server';
import { getUserFromToken } from '../auth';
import { cookies } from 'next/headers';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  orgId: string;
  locale?: string;
}

export async function getCurrentUser(req: NextRequest): Promise<UserSession | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no Authorization header, try cookies
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('fixzit_auth')?.value;
    }

    if (!token) {
      return null;
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      orgId: user.tenantId, // orgId is same as tenantId in this system
      locale: getUserLocale(req)
    };

  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

function getUserLocale(req: NextRequest): string {
  // Get locale from Accept-Language header
  const acceptLanguage = req.headers.get('accept-language') || 'en';
  return acceptLanguage.startsWith('ar') ? 'ar' : 'en';
}

// Mock session for development/testing
export async function getMockSession(): Promise<UserSession> {
  return {
    id: 'guest',
    email: 'guest@fixzit.co',
    name: 'Guest User',
    role: 'GUEST',
    tenantId: 'demo-tenant',
    orgId: 'demo-tenant',
    locale: 'en'
  };
}
