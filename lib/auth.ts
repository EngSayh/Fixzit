import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User } from '@/server/models/User';
import { db } from '@/lib/mongo';

// Type definition for User document
interface UserDocument {
  _id: { toString(): string };
  email: string;
  password: string; // Changed from passwordHash
  isActive?: boolean;
  status?: string;
  role?: string;
  orgId?: { toString(): string } | string;
  name?: string;
  personal?: { // Changed from personalInfo
    firstName?: string;
    lastName?: string;
  };
  professional?: { // Changed from professionalInfo
    role?: string;
  };
  [key: string]: unknown; // Allow additional fields
}

// Lazy initialization - only validate at runtime, not build time
// JWT secret is loaded on first use, with fallback for development
let JWT_SECRET: string | undefined;

function getJWTSecret(): string {
  if (JWT_SECRET) {
    return JWT_SECRET;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    JWT_SECRET = envSecret;
    return JWT_SECRET;
  }

  // CRITICAL: Production must have JWT_SECRET configured
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 FATAL: JWT_SECRET is not configured in production environment');
    console.error('🚨 Application cannot start without JWT_SECRET in production');
    throw new Error('JWT_SECRET is required in production environment');
  }
  
  // Development/build-time fallback - generate ephemeral secret
  // NOTE: Tokens will not persist across restarts in development
  // WARNING: JWT_SECRET not set. Using ephemeral secret for development.
  // Set JWT_SECRET environment variable for session persistence.
  const fallbackSecret = randomBytes(32).toString('hex');
  
  JWT_SECRET = fallbackSecret;
  return JWT_SECRET;
}

export interface AuthToken {
  id: string;
  email: string;
  role: string;
  orgId: string;
  tenantId?: string;
  name?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: AuthToken): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, getJWTSecret()) as AuthToken;
  } catch {
    return null;
  }
}

export async function authenticateUser(emailOrEmployeeNumber: string, password: string, loginType: 'personal' | 'corporate' = 'personal') {
  // Ensure database connection is established
  await db;

  let user;
  if (loginType === 'personal') {
    user = await User.findOne({ email: emailOrEmployeeNumber });
  } else {
    // For corporate login, search by employee number (username field)
    user = await User.findOne({ username: emailOrEmployeeNumber });
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Check if user is active (handle both status and isActive fields)
  const isUserActive = user.isActive !== undefined ? user.isActive : (user.status === 'ACTIVE');
  if (!isUserActive) {
    throw new Error('Account is not active');
  }

  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    role: user.professional?.role || user.role || 'USER',
    orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || '')
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim(),
      role: user.professional?.role || user.role || 'USER',
      orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || '')
    }
  };
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  // Database connection handled by model layer
  const user = await User.findById(payload.id);

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim(),
    role: user.professional?.role || user.role || 'USER',
    orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || '')
  };
}

