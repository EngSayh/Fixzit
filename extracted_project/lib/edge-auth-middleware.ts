import { NextRequest } from 'next/server';
import type { EnhancedUser } from './types/rbac';

export interface EdgeAuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ name: string }>;
  permissions: string[];
  organizationId: string;
  isActive: boolean;
}

export interface AuthenticationError {
  error: string;
  statusCode: number;
}

// Secure session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'fixzit-secure-session-key-2024';
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Secure Session Payload interface
 */
interface SecureSessionPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ name: string }>;
  permissions: string[];
  organizationId: string;
  isActive: boolean;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

/**
 * Edge-safe authentication function using secure session tokens
 * Works without external dependencies for Edge runtime compatibility
 */
export async function authenticateRequest(request?: NextRequest): Promise<EdgeAuthenticatedUser | AuthenticationError> {
  try {
    // Get session token from various cookie names for compatibility
    let sessionToken: string | undefined;
    
    if (request) {
      sessionToken = request.cookies.get('fz_session')?.value ||
                    request.cookies.get('session')?.value ||
                    request.cookies.get('auth_token')?.value ||
                    request.cookies.get('next-auth.session-token')?.value ||
                    request.cookies.get('fixzit_session')?.value;
    }

    if (!sessionToken) {
      return {
        error: 'Authentication required. Please login to access this resource.',
        statusCode: 401
      };
    }

    // Handle legacy token format during transition period
    if (sessionToken.startsWith('token-')) {
      const tokenParts = sessionToken.split('-');
      if (tokenParts.length >= 3) {
        const role = tokenParts[1];
        const timestamp = parseInt(tokenParts[2]);
        
        // Check if legacy token is still valid (max 1 hour grace period)
        const tokenAge = Date.now() - timestamp;
        const gracePeriod = 60 * 60 * 1000; // 1 hour
        
        if (tokenAge <= gracePeriod) {
          console.warn('Using legacy token format - please re-authenticate for enhanced security');
          const userMap = getEdgeUserData(role);
          if (userMap) {
            return userMap;
          }
        }
      }
      
      return {
        error: 'Legacy session expired. Please login again for enhanced security.',
        statusCode: 401
      };
    }

    try {
      // Parse and verify secure session token
      const sessionData = await verifySecureSession(sessionToken);
      
      if (!sessionData) {
        return {
          error: 'Invalid session token. Please login again.',
          statusCode: 401
        };
      }

      // Check expiration
      if (Date.now() > sessionData.expiresAt) {
        return {
          error: 'Session expired. Please login again.',
          statusCode: 401
        };
      }

      // Check if user is active
      if (!sessionData.isActive) {
        return {
          error: 'User account is deactivated.',
          statusCode: 403
        };
      }

      // Return authenticated user
      return {
        id: sessionData.userId,
        email: sessionData.email,
        firstName: sessionData.firstName,
        lastName: sessionData.lastName,
        roles: sessionData.roles,
        permissions: sessionData.permissions,
        organizationId: sessionData.organizationId,
        isActive: sessionData.isActive
      };

    } catch (sessionError: any) {
      console.error('Session verification failed:', sessionError.message);
      return {
        error: 'Invalid or corrupted session token. Please login again.',
        statusCode: 401
      };
    }

  } catch (error) {
    console.error('Edge authentication error:', error);
    return {
      error: 'Authentication service temporarily unavailable.',
      statusCode: 500
    };
  }
}

/**
 * Create a secure session token using built-in crypto
 */
export async function createSecureSession(user: EdgeAuthenticatedUser): Promise<string> {
  const payload: SecureSessionPayload = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    permissions: user.permissions,
    organizationId: user.organizationId,
    isActive: user.isActive,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY,
    signature: ''
  };

  // Create signature using built-in crypto
  const dataToSign = JSON.stringify({
    userId: payload.userId,
    email: payload.email,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt
  });
  
  payload.signature = await generateSignature(dataToSign);
  
  // Base64 encode the entire payload
  return btoa(JSON.stringify(payload));
}

/**
 * Verify a secure session token
 */
async function verifySecureSession(sessionToken: string): Promise<SecureSessionPayload | null> {
  try {
    // Decode base64
    const payload: SecureSessionPayload = JSON.parse(atob(sessionToken));
    
    // Verify required fields
    if (!payload.userId || !payload.email || !payload.signature || 
        !payload.issuedAt || !payload.expiresAt) {
      return null;
    }
    
    // Recreate signature for verification
    const dataToSign = JSON.stringify({
      userId: payload.userId,
      email: payload.email,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt
    });
    
    const expectedSignature = await generateSignature(dataToSign);
    
    // Verify signature
    if (payload.signature !== expectedSignature) {
      console.error('Session signature verification failed');
      return null;
    }
    
    return payload;
    
  } catch (error) {
    console.error('Session parsing error:', error);
    return null;
  }
}

/**
 * Generate HMAC signature using built-in crypto (edge-compatible)
 */
async function generateSignature(data: string): Promise<string> {
  // Use built-in crypto for edge compatibility
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SESSION_SECRET);
  const messageData = encoder.encode(data);
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Generate signature
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get user data and permissions for edge runtime (without database calls)
 */
function getEdgeUserData(role: string): EdgeAuthenticatedUser | null {
  const roleUserMap: Record<string, EdgeAuthenticatedUser> = {
    'admin': {
      id: 'admin-user-id',
      email: 'admin@fixzit.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: [{ name: 'admin' }],
      permissions: [
        'dashboard.read',
        'work-orders.read', 'work-orders.create', 'work-orders.update', 'work-orders.delete',
        'properties.read', 'properties.create', 'properties.update', 'properties.delete',
        'finance.read', 'finance.create', 'finance.update', 'finance.delete',
        'crm.read', 'crm.create', 'crm.update', 'crm.delete',
        'marketplace.read', 'marketplace.create', 'marketplace.update', 'marketplace.delete',
        'hr.read', 'hr.create', 'hr.update', 'hr.delete',
        'support.read', 'support.create', 'support.update', 'support.delete',
        'compliance.read', 'compliance.create', 'compliance.update', 'compliance.delete',
        'reports.read', 'reports.create',
        'admin.read', 'admin.create', 'admin.update', 'admin.delete',
        'system.read', 'system.create', 'system.update', 'system.delete',
        'audit.read', 'audit.create',
        'users.read', 'users.create', 'users.update', 'users.delete'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'finance': {
      id: 'finance-user-id',
      email: 'finance@fixzit.com',
      firstName: 'Finance',
      lastName: 'Manager',
      roles: [{ name: 'finance_manager' }],
      permissions: [
        'dashboard.read',
        'finance.read', 'finance.create', 'finance.update',
        'finance.invoices.read', 'finance.invoices.create', 'finance.invoices.update',
        'properties.read',
        'reports.read'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'hr': {
      id: 'hr-user-id',
      email: 'hr@fixzit.com',
      firstName: 'HR',
      lastName: 'Manager',
      roles: [{ name: 'hr_manager' }],
      permissions: [
        'dashboard.read',
        'hr.read', 'hr.create', 'hr.update',
        'reports.read'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'marketplace': {
      id: 'marketplace-user-id',
      email: 'marketplace@fixzit.com',
      firstName: 'Marketplace',
      lastName: 'Manager',
      roles: [{ name: 'marketplace_manager' }],
      permissions: [
        'dashboard.read',
        'marketplace.read', 'marketplace.create', 'marketplace.update',
        'reports.read'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'vendor': {
      id: 'vendor-user-id',
      email: 'vendor@fixzit.com',
      firstName: 'Vendor',
      lastName: 'User',
      roles: [{ name: 'vendor' }],
      permissions: [
        'dashboard.read',
        'marketplace.read',
        'work-orders.read'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'property_manager': {
      id: 'pm-user-id',
      email: 'pm@fixzit.com',
      firstName: 'Property',
      lastName: 'Manager',
      roles: [{ name: 'property_manager' }],
      permissions: [
        'dashboard.read',
        'work-orders.read', 'work-orders.create', 'work-orders.update',
        'properties.read', 'properties.create', 'properties.update',
        'reports.read'
      ],
      organizationId: 'default-org',
      isActive: true
    },
    'tenant': {
      id: 'tenant-user-id',
      email: 'tenant@fixzit.com',
      firstName: 'Tenant',
      lastName: 'User',
      roles: [{ name: 'tenant' }],
      permissions: [
        'dashboard.read',
        'work-orders.read', 'work-orders.create'
      ],
      organizationId: 'default-org',
      isActive: true
    }
  };

  return roleUserMap[role] || null;
}

/**
 * Check if user has required permission (edge-safe)
 */
export function hasPermission(user: EdgeAuthenticatedUser, requiredPermission: string): boolean {
  return user.permissions.includes(requiredPermission) || 
         user.permissions.includes('*') ||
         user.roles?.[0]?.name === 'super_admin';
}

/**
 * Check if user has marketplace access (edge-safe)
 */
export function hasMarketplaceAccess(user: EdgeAuthenticatedUser): boolean {
  const marketplacePermissions = [
    'marketplace.read',
    'marketplace.create', 
    'marketplace.update',
    'marketplace.manage',
    '*'
  ];
  
  return marketplacePermissions.some(permission => 
    user.permissions.includes(permission)
  ) || user.roles?.[0]?.name === 'super_admin';
}

/**
 * Mask sensitive user information for public responses (edge-safe)
 */
export function maskUserInfo(user: any): any {
  if (!user) return null;
  
  return {
    id: user.id,
    name: user.firstName && user.lastName ? 
      `${user.firstName} ${user.lastName}` : 
      'Anonymous User',
    verified: !!user.email
  };
}

/**
 * Mask sensitive vendor information for public responses (edge-safe)
 */
export function maskVendorInfo(vendor: any): any {
  if (!vendor) return null;
  
  return {
    ...vendor,
    contactEmail: vendor.contactEmail ? 
      vendor.contactEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 
      null,
    contactPhone: vendor.contactPhone ? 
      vendor.contactPhone.replace(/(.{3})(.*)(.{2})/, '$1***$3') : 
      null,
    user: vendor.user ? maskUserInfo(vendor.user) : null
  };
}