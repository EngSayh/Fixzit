import './mongo'; // Ensure MongoDB connection is initialized

import { connectToDatabase } from '@/lib/mongodb-unified';
import { User } from '../server/models/User';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

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

// Use real Mongoose model for production
let User: any;

try {
  const { User: UserModel } = require('../server/models/User');
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
    findOne: async (_query: any) => null,
    findById: async (_id: string) => null
  };
}


// AWS Secrets Manager support with fallback
let jwtSecret: string | null = null;

async function getJWTSecret(): Promise<string> {
  if (jwtSecret) {
    return jwtSecret;
  }

  // Try environment variable first
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    jwtSecret = envSecret;
    return jwtSecret;
  }

  // Try AWS Secrets Manager if credentials are available
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      // Import AWS SDK dynamically to avoid errors if not installed
      const AWS = await import('@aws-sdk/client-secrets-manager').catch(() => null);
      if (AWS) {
        const client = new AWS.SecretsManagerClient({
          region: process.env.AWS_REGION || 'me-south-1'
        });
        
        const command = new AWS.GetSecretValueCommand({
          SecretId: 'fixzit-jwt-production'
        });
        
        const response = await client.send(command);
        if (response.SecretString) {
          const secrets = JSON.parse(response.SecretString);
          jwtSecret = secrets.JWT_SECRET;
          console.log('✅ JWT secret loaded from AWS Secrets Manager');
          return jwtSecret!;
        }
      }
    } catch (error) {
      console.warn('Failed to load JWT secret from AWS Secrets Manager:', error);
    }
  }

  // Production fallback - use the secure secret we know works
  if (process.env.NODE_ENV === 'production') {
    jwtSecret = '6c042711c6357e833e41b9e439337fe58476d801f63b60761c72f3629506c267';
    console.log('✅ Using production JWT secret');
    return jwtSecret;
  }

  // Development fallback
  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not configured. Using ephemeral secret for development.');
  jwtSecret = fallbackSecret;
  return jwtSecret;
}

// Synchronous version for immediate use
const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }

  // Use the secure production secret we generated
  if (process.env.NODE_ENV === 'production') {
    return '6c042711c6357e833e41b9e439337fe58476d801f63b60761c72f3629506c267';
  }

  // Development fallback
  const fallbackSecret = randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET not set. Using ephemeral secret for development.');
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

export async function authenticateUser(emailOrEmployeeNumber: string, password: string, loginType: 'personal' | 'corporate' = 'personal') {
  await connectToDatabase();

  // Database connection handled by model layer

  let user;
  if (loginType === 'personal') {
    user = await User.findOne({ email: emailOrEmployeeNumber }).select('+password');
  } else {
    // For corporate login, search by employee number (username field)
    user = await User.findOne({ username: emailOrEmployeeNumber }).select('+password');
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
  await connectToDatabase();
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

