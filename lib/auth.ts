import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Use real Mongoose model for production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let User: any; // MongoDB model with dynamic query methods

try {
  const { User: UserModel } = require('@/modules/users/schema');
  User = UserModel;
} catch (error) {
  const errorMessage = `CRITICAL: Failed to load User model from @/modules/users/schema - ${error instanceof Error ? error.message : String(error)}`;
  console.error(errorMessage);
  
  if (process.env.NODE_ENV === 'production') {
    console.error('Authentication system cannot start without User model in production');
    process.exit(1);
  }
  
  console.warn('Development/test environment detected: using fallback User implementation');
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

  // Development/build-time fallback - generate ephemeral secret
  // NOTE: In production runtime, this will work but tokens won't persist across restarts
  // Always set JWT_SECRET in production environment variables
  const fallbackSecret = randomBytes(32).toString('hex');
  
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING: JWT_SECRET not configured in production. Using ephemeral secret.');
    console.warn('⚠️ Tokens will not persist across server restarts. Set JWT_SECRET in environment.');
  } else {
    console.warn('⚠️ JWT_SECRET not set. Using ephemeral secret for development.');
    console.warn('⚠️ Set JWT_SECRET environment variable for session persistence.');
  }
  
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
    role: user.professionalInfo?.role || user.role,
    orgId: user.orgId
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
      role: user.professionalInfo?.role || user.role,
      orgId: user.orgId
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
    name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
    role: user.professionalInfo?.role || user.role,
    orgId: user.orgId
  };
}

