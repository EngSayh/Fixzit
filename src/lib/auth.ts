// Authentication and session management
// Implements JWT-based authentication with role-based access

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { Role } from './rbac-comprehensive';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
  phone?: string;
  phoneVerified?: boolean;
  kycVerified?: boolean;
  falVerified?: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-enterprise-secret-2024';
const JWT_EXPIRES_IN = '7d';

// Create JWT token
export function createToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    kycVerified: user.kycVerified,
    falVerified: user.falVerified,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  return jwt.sign(payload, JWT_SECRET);
}

// Verify JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      tenantId: decoded.tenantId,
      phone: decoded.phone,
      phoneVerified: decoded.phoneVerified,
      kycVerified: decoded.kycVerified,
      falVerified: decoded.falVerified,
      createdAt: new Date(decoded.createdAt),
      lastLoginAt: decoded.lastLoginAt ? new Date(decoded.lastLoginAt) : undefined
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Get session from request
export async function getSession(req: NextRequest): Promise<Session | null> {
  try {
    const token = req.cookies.get('fixzit_auth')?.value;
    if (!token) {
      return null;
    }

    const user = verifyToken(token);
    if (!user) {
      return null;
    }

    return {
      user,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

// Get session from server components
export async function getServerSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('fixzit_auth')?.value;
    if (!token) {
      return null;
    }

    const user = verifyToken(token);
    if (!user) {
      return null;
    }

    return {
      user,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Server session error:', error);
    return null;
  }
}

// Set authentication cookie
export function setAuthCookie(user: User): string {
  const token = createToken(user);
  const cookieStore = cookies();
  
  cookieStore.set('fixzit_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  });

  return token;
}

// Clear authentication cookie
export function clearAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete('fixzit_auth');
}

// Check if user has required role
export function hasRole(user: User, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    'SUPER_ADMIN': 100,
    'CORPORATE_ADMIN': 90,
    'ADMIN': 80,
    'FINANCE_CONTROLLER': 70,
    'COMPLIANCE_AUDITOR': 70,
    'PROPERTY_MANAGER': 60,
    'LEASING_CRM_MANAGER': 60,
    'FINANCE_MANAGER': 60,
    'HR_MANAGER': 60,
    'BROKER_AGENT': 50,
    'TECHNICIAN': 40,
    'TEAM_MEMBER': 30,
    'VENDOR': 20,
    'TENANT': 10,
    'GUEST': 0
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Check if user can access module
export function canAccessModule(user: User, module: string): boolean {
  // TODO: Implement module access check based on RBAC
  // For now, basic role-based access
  const moduleAccess: Record<Role, string[]> = {
    'SUPER_ADMIN': ['*'], // All modules
    'CORPORATE_ADMIN': ['dashboard', 'work-orders', 'properties', 'finance', 'hr', 'crm', 'marketplace', 'support', 'reports'],
    'ADMIN': ['dashboard', 'work-orders', 'properties', 'finance', 'hr', 'crm', 'marketplace', 'support', 'reports'],
    'PROPERTY_MANAGER': ['dashboard', 'work-orders', 'properties', 'marketplace', 'support', 'reports'],
    'LEASING_CRM_MANAGER': ['dashboard', 'work-orders', 'properties', 'crm', 'marketplace', 'support', 'reports'],
    'FINANCE_MANAGER': ['dashboard', 'properties', 'finance', 'support', 'reports'],
    'HR_MANAGER': ['dashboard', 'hr', 'support', 'reports'],
    'TECHNICIAN': ['dashboard', 'work-orders', 'support', 'reports'],
    'TEAM_MEMBER': ['dashboard', 'work-orders', 'crm', 'marketplace', 'support', 'reports'],
    'TENANT': ['dashboard', 'work-orders', 'properties', 'finance', 'marketplace', 'support', 'reports'],
    'VENDOR': ['dashboard', 'work-orders', 'marketplace', 'support', 'reports'],
    'BROKER_AGENT': ['dashboard', 'properties', 'marketplace', 'support', 'compliance', 'reports'],
    'FINANCE_CONTROLLER': ['dashboard', 'finance', 'compliance', 'reports'],
    'COMPLIANCE_AUDITOR': ['dashboard', 'work-orders', 'properties', 'finance', 'support', 'compliance', 'reports'],
    'GUEST': ['dashboard', 'marketplace', 'support']
  };

  const userModules = moduleAccess[user.role] || [];
  return userModules.includes('*') || userModules.includes(module);
}

// Check if user requires KYC
export function requiresKYC(user: User): boolean {
  return !user.kycVerified && user.role !== 'GUEST';
}

// Check if user requires FAL verification
export function requiresFAL(user: User): boolean {
  return !user.falVerified && user.role === 'BROKER_AGENT';
}

// Check if user can perform action
export function canPerformAction(user: User, action: string, resource?: string): boolean {
  // TODO: Implement comprehensive permission checking
  // For now, basic role-based checks
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  if (user.role === 'GUEST') {
    return ['browse', 'view', 'search'].includes(action);
  }

  // Add more specific permission checks here
  return true;
}

// Generate guest user for unauthenticated requests
export function createGuestUser(): User {
  return {
    id: 'guest',
    email: '',
    name: 'Guest User',
    role: 'GUEST',
    createdAt: new Date()
  };
}