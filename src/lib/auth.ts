import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { isMockDB } from '@/src/lib/mongo';

// Enhanced User model definition for auth purposes
interface UserDoc {
  _id: string;
  tenantId: string;
  email: string;
  password: string;
  personal?: {
    firstName: string;
    lastName: string;
  };
  personalInfo?: {
    firstName: string;
    lastName: string;
  };
  professional?: {
    role: string;
  };
  professionalInfo?: {
    role: string;
  };
  role?: string;
  status: string;
  orgId?: string;
  username?: string;
  code?: string;
}

// Dynamic User model with enhanced security
let User: any;

if (isMockDB) {
  // Enhanced mock model with comprehensive test users
  User = {
    findOne: async (query: any) => {
      const users: UserDoc[] = [
        {
          _id: '1',
          tenantId: 'demo-tenant',
          email: 'superadmin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // Admin@123
          personal: { firstName: 'System', lastName: 'Administrator' },
          professional: { role: 'SUPER_ADMIN' },
          status: 'ACTIVE',
          username: 'superadmin',
          code: 'USR-001'
        },
        {
          _id: '2',
          tenantId: 'demo-tenant',
          email: 'admin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: { firstName: 'Admin', lastName: 'User' },
          professional: { role: 'ADMIN' },
          status: 'ACTIVE',
          username: 'admin',
          code: 'USR-002'
        },
        {
          _id: '3',
          tenantId: 'demo-tenant',
          email: 'manager@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: { firstName: 'Property', lastName: 'Manager' },
          professional: { role: 'PROPERTY_MANAGER' },
          status: 'ACTIVE',
          username: 'manager',
          code: 'USR-003'
        },
        {
          _id: '4',
          tenantId: 'demo-tenant',
          email: 'tenant@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: { firstName: 'Ahmed', lastName: 'Al-Rashid' },
          professional: { role: 'TENANT' },
          status: 'ACTIVE',
          username: 'tenant',
          code: 'USR-004'
        },
        {
          _id: '5',
          tenantId: 'demo-tenant',
          email: 'vendor@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: { firstName: 'Mohammed', lastName: 'Al-Harbi' },
          professional: { role: 'VENDOR' },
          status: 'ACTIVE',
          username: 'vendor',
          code: 'USR-005'
        }
      ];

      if (query.email) {
        return users.find(user => user.email === query.email);
      }
      if (query.username) {
        return users.find(user => user.username === query.username);
      }
      return null;
    },
    findById: async (id: string) => {
      const users: UserDoc[] = [
        {
          _id: '1',
          tenantId: 'demo-tenant',
          email: 'superadmin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa',
          personal: { firstName: 'System', lastName: 'Administrator' },
          professional: { role: 'SUPER_ADMIN' },
          status: 'ACTIVE',
          username: 'superadmin',
          code: 'USR-001'
        },
        {
          _id: '2',
          tenantId: 'demo-tenant',
          email: 'admin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa',
          personal: { firstName: 'Admin', lastName: 'User' },
          professional: { role: 'ADMIN' },
          status: 'ACTIVE',
          username: 'admin',
          code: 'USR-002'
        },
        {
          _id: '3',
          tenantId: 'demo-tenant',
          email: 'manager@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa',
          personal: { firstName: 'Property', lastName: 'Manager' },
          professional: { role: 'PROPERTY_MANAGER' },
          status: 'ACTIVE',
          username: 'manager',
          code: 'USR-003'
        },
        {
          _id: '4',
          tenantId: 'demo-tenant',
          email: 'tenant@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa',
          personal: { firstName: 'Ahmed', lastName: 'Al-Rashid' },
          professional: { role: 'TENANT' },
          status: 'ACTIVE',
          username: 'tenant',
          code: 'USR-004'
        },
        {
          _id: '5',
          tenantId: 'demo-tenant',
          email: 'vendor@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa',
          personal: { firstName: 'Mohammed', lastName: 'Al-Harbi' },
          professional: { role: 'VENDOR' },
          status: 'ACTIVE',
          username: 'vendor',
          code: 'USR-005'
        }
      ];

      return users.find(user => user._id === id);
    }
  };
} else {
  // Use real Mongoose model for production
  try {
    const { User: UserModel } = require('@/src/server/models/User');
    User = UserModel;
  } catch (error) {
    console.warn('Could not load User model, falling back to mock implementation:', error);
    // Fallback to same mock implementation if model loading fails
    User = {
      findOne: async (query: any) => null,
      findById: async (id: string) => null
    };
  }
}

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
