import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { isMockDB, db } from '@/src/lib/mongo';

// Dynamic import for User model to avoid Edge Runtime issues
let User: any;
if (isMockDB) {
  // Use mock model for development
  User = {
    findOne: async (query: any) => {
      const users = [
        {
          _id: '1',
          code: 'USR-001',
          username: 'superadmin',
          email: 'superadmin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // Admin@123
          personal: {
            firstName: 'System',
            lastName: 'Administrator'
          },
          professional: {
            role: 'SUPER_ADMIN'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '2',
          code: 'USR-002',
          username: 'admin',
          email: 'admin@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: {
            firstName: 'Admin',
            lastName: 'User'
          },
          professional: {
            role: 'ADMIN'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '3',
          code: 'USR-003',
          username: 'manager',
          email: 'manager@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: {
            firstName: 'Property',
            lastName: 'Manager'
          },
          professional: {
            role: 'PROPERTY_MANAGER'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '4',
          code: 'USR-004',
          username: 'tenant',
          email: 'tenant@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: {
            firstName: 'Ahmed',
            lastName: 'Al-Rashid'
          },
          professional: {
            role: 'TENANT'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '5',
          code: 'USR-005',
          username: 'vendor',
          email: 'vendor@fixzit.co',
          password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
          personal: {
            firstName: 'Mohammed',
            lastName: 'Al-Harbi'
          },
          professional: {
            role: 'VENDOR'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        }
      ];

      return users.find(user => user.email === query.email);
    },
    findById: async (id: string) => {
      const users = [
        {
          _id: '1',
          email: 'superadmin@fixzit.co',
          personal: {
            firstName: 'System',
            lastName: 'Administrator'
          },
          professional: {
            role: 'SUPER_ADMIN'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '2',
          email: 'admin@fixzit.co',
          personal: {
            firstName: 'Admin',
            lastName: 'User'
          },
          professional: {
            role: 'ADMIN'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '3',
          email: 'manager@fixzit.co',
          personal: {
            firstName: 'Property',
            lastName: 'Manager'
          },
          professional: {
            role: 'PROPERTY_MANAGER'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '4',
          email: 'tenant@fixzit.co',
          personal: {
            firstName: 'Ahmed',
            lastName: 'Al-Rashid'
          },
          professional: {
            role: 'TENANT'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        },
        {
          _id: '5',
          email: 'vendor@fixzit.co',
          personal: {
            firstName: 'Mohammed',
            lastName: 'Al-Harbi'
          },
          professional: {
            role: 'VENDOR'
          },
          status: 'ACTIVE',
          tenantId: 'demo-tenant'
        }
      ];

      return users.find(user => user._id === id);
    }
  };
} else {
  // Use real Mongoose model for non-mock mode
  try {
    User = require('@/src/server/models/User').User;
  } catch (error) {
    console.warn('Could not load User model:', error);
    User = null;
  }
}

const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  const ephemeral = randomBytes(32).toString('hex');
  console.warn('JWT_SECRET missing. Using ephemeral dev secret; tokens reset on restart.');
  return ephemeral;
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
