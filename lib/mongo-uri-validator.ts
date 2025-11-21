/**
 * MongoDB URI validation helper
 * Use this to validate MongoDB URIs in scripts and services
 * Enforces Atlas-only URIs in production
 */

import { getEnv } from './env';
import { logger } from '@/lib/logger';

const isProd = process.env.NODE_ENV === 'production';

export function getValidatedMongoUri(): string {
  const rawMongoUri = getEnv('MONGODB_URI');
  
  if (rawMongoUri && rawMongoUri.trim().length > 0) {
    assertNotLocalhostInProd(rawMongoUri);
    assertAtlasUriInProd(rawMongoUri);
    return rawMongoUri;
  }
  
  if (!isProd) {
    logger.warn('MONGODB_URI not set, using localhost fallback', { component: 'MongoDB' });
    return 'mongodb://127.0.0.1:27017';
  }
  
  throw new Error('FATAL: MONGODB_URI is required in production');
}

function assertNotLocalhostInProd(uri: string): void {
  if (!isProd) return;
  
  const localPatterns = [
    'mongodb://localhost',
    'mongodb://127.0.0.1',
    'mongodb://0.0.0.0',
  ];
  
  if (localPatterns.some((pattern) => uri.startsWith(pattern))) {
    throw new Error('FATAL: Local MongoDB URIs not allowed in production. Use MongoDB Atlas.');
  }
}

function assertAtlasUriInProd(uri: string): void {
  if (!isProd) return;
  if (!uri.startsWith('mongodb+srv://')) {
    throw new Error('FATAL: Production deployments require a MongoDB Atlas connection string (mongodb+srv://).');
  }
}

export function validateMongoUri(uri: string | undefined): void {
  if (!uri) {
    if (isProd) {
      throw new Error('FATAL: MONGODB_URI is required in production');
    }
    return;
  }
  
  assertNotLocalhostInProd(uri);
  assertAtlasUriInProd(uri);
}
