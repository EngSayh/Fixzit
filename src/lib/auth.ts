import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { prisma } from '@/lib/database';
import { connectMongoDB } from '@/lib/database';

// Check if we should use mock database
const isMockDB = process.env.NODE_ENV === 'development' && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost'));

// Mock users for development
const mockUsers = [
  {
    id: '1',
    email: 'superadmin@fixzit.co',
    password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // Admin@123
    name: 'System Administrator',
    role: 'SUPER_ADMIN',
    tenantId: 'demo-tenant'
  },
  {
    id: '2',
    email: 'admin@fixzit.co',
    password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
    name: 'Admin User',
    role: 'ADMIN',
    tenantId: 'demo-tenant'
  },
  {
    id: '3',
    email: 'manager@fixzit.co',
    password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
    name: 'Property Manager',
    role: 'FM_MANAGER',
    tenantId: 'demo-tenant'
  },
  {
    id: '4',
    email: 'tenant@fixzit.co',
    password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
    name: 'Ahmed Al-Rashid',
    role: 'TENANT',
    tenantId: 'demo-tenant'
  },
  {
    id: '5',
    email: 'vendor@fixzit.co',
    password: '$2b$10$kbeyZf.xR/qw4hw7qfDxT.SQon2mBoggroifO6nRhl1KUGkJHarIa', // password123
    name: 'Mohammed Al-Harbi',
    role: 'VENDOR',
    tenantId: 'demo-tenant'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-enterprise-secret-2024';

export interface AuthToken {
  id: string;
  email: string;
  name?: string;
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
  let user;

  if (isMockDB) {
    // Use mock data for development
    user = mockUsers.find(u => u.email === emailOrEmployeeNumber);
  } else {
    // Use real database
    try {
      // Try PostgreSQL first
      user = await prisma.user.findUnique({
        where: { email: emailOrEmployeeNumber }
      });
    } catch (error) {
      console.log('PostgreSQL not available, trying MongoDB...');
      // Fallback to MongoDB
      const mongoDb = await connectMongoDB();
      const usersCollection = mongoDb.collection('users');
      user = await usersCollection.findOne({ email: emailOrEmployeeNumber });
    }
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    id: (user as any).id || (user as any)._id?.toString(),
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  });

  return {
    token,
    user: {
      id: (user as any).id || (user as any)._id?.toString(),
      email: user.email,
      name: (user as any).name || `${(user as any).personal?.firstName || ''} ${(user as any).personal?.lastName || ''}`.trim(),
      role: user.role,
      tenantId: user.tenantId
    }
  };
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  let user;

  if (isMockDB) {
    // Use mock data for development
    user = mockUsers.find(u => u.id === payload.id);
  } else {
    // Use real database
    try {
      // Try PostgreSQL first
      user = await prisma.user.findUnique({
        where: { id: payload.id }
      });
    } catch (error) {
      console.log('PostgreSQL not available, trying MongoDB...');
      // Fallback to MongoDB
      const mongoDb = await connectMongoDB();
      const usersCollection = mongoDb.collection('users');
      user = await usersCollection.findOne({ _id: new ObjectId(payload.id) });
    }
  }

  if (!user) {
    return null;
  }

  return {
    id: (user as any).id || (user as any)._id?.toString(),
    email: user.email,
    name: (user as any).name || `${(user as any).personal?.firstName || ''} ${(user as any).personal?.lastName || ''}`.trim(),
    role: user.role,
    tenantId: user.tenantId
  };
}
