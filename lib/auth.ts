// Simplified auth without external dependencies for now
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

// Mock users for testing (replace with database)
const mockUsers = {
  'admin@fixzit.com': {
    id: '1',
    email: 'admin@fixzit.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
    passwordHash: 'Admin@123' // In production, this would be hashed
  },
  'tenant@fixzit.com': {
    id: '2',
    email: 'tenant@fixzit.com',
    name: 'Tenant User',
    role: 'TENANT',
    permissions: ['tenant:read', 'tenant:write'],
    passwordHash: 'Tenant@123'
  },
  'owner@fixzit.com': {
    id: '3',
    email: 'owner@fixzit.com',
    name: 'Property Owner',
    role: 'OWNER',
    permissions: ['owner:read', 'owner:write'],
    passwordHash: 'Owner@123'
  }
};

// Generate JWT token (simplified)
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  // Simple token encoding (replace with proper JWT in production)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify JWT token (simplified)
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload as TokenPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = mockUsers[email as keyof typeof mockUsers];
  
  if (!user || user.passwordHash !== password) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions
  };
}

// Check if user has required role
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// Check if user has required permission
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}