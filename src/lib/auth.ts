import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { isMockDB, db } from '@/src/lib/mongo';

// Dynamic import for User model to avoid Edge Runtime issues
// Always use real Mongoose model (mock removed)
const User = (await import('@/src/server/models/User')).default;

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-enterprise-secret-2024';

export interface AuthToken {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: AuthToken): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(emailOrEmployeeNumber: string, password: string, loginType: 'personal' | 'corporate' = 'personal') {
  // Connect to database (mock or real)
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

  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active');
  }

  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    role: user.professional.role,
    tenantId: user.tenantId
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: `${user.personal.firstName} ${user.personal.lastName}`,
      role: user.professional.role,
      tenantId: user.tenantId
    }
  };
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  await db;
  const user = await User.findById(payload.id);

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: `${user.personal.firstName} ${user.personal.lastName}`,
    role: user.professional.role,
    tenantId: user.tenantId
  };
}
