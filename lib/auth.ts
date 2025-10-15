import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Type definition for User document
interface UserDocument {
  _id: { toString(): string };
  email: string;
  password: string;
  status: string;
  role?: string;
  orgId?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
  };
  professionalInfo?: {
    role?: string;
  };
  [key: string]: unknown; // Allow additional fields
}

// Type definition for User model with MongoDB methods
interface UserModel {
  findOne: (query: Record<string, unknown>) => Promise<UserDocument | null>;
  findById: (id: string) => Promise<UserDocument | null>;
  [key: string]: unknown; // Allow additional MongoDB methods
}

// Use real Mongoose model for production
let User: UserModel;

try {
  const { User: UserModel } = require('@/modules/users/schema');
  User = UserModel as UserModel;
} catch (error) {
  const errorMessage = `CRITICAL: Failed to load User model from @/modules/users/schema - ${error instanceof Error ? error.message : String(error)}`;
  console.error(errorMessage);
  
  if (process.env.NODE_ENV === 'production') {
    console.error('Authentication system cannot start without User model in production');
    process.exit(1);
  }
  
  // Development/test environment detected: using fallback User implementation
  // Lightweight fallback for development/test only
  User = {
    findOne: async (_query: Record<string, unknown>) => null,
    findById: async (_id: string) => null
  };
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
  // Database connection handled by model layer

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

  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active');
  }

  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    role: user.professionalInfo?.role || user.role || 'USER',
    orgId: user.orgId || ''
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim(),
      role: user.professionalInfo?.role || user.role || 'USER',
      orgId: user.orgId || ''
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
    name: `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim(),
    role: user.professionalInfo?.role || user.role || 'USER',
    orgId: user.orgId || ''
  };
}

