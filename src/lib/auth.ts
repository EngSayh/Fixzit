import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { connectMongo } from '@/src/lib/mongo';
import { User } from '@/src/server/models/User';

const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be configured in production environments.');
  }

  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn(
    'JWT_SECRET is not set. Using an ephemeral secret for this process. Sessions will be invalidated on restart.'
  );
  return fallbackSecret;
})();

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
  // Ensure we have a live database connection when not using the mock layer
  await connectMongo();

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

  await connectMongo();
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
