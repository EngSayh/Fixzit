/**
 * MongoDB URI validation helper
 * Use this to validate MongoDB URIs in scripts and services
 * Enforces Atlas-only URIs in production
 */

import { getEnv } from './env';

const isProd = process.env.NODE_ENV === 'production';

export function getValidatedMongoUri(): string {
  const rawMongoUri = getEnv('MONGODB_URI');
  
  if (rawMongoUri && rawMongoUri.trim().length > 0) {
    assertNotLocalhostInProd(rawMongoUri);
    return rawMongoUri;
  }
  
  if (!isProd) {
    console.warn('[Mongo] MONGODB_URI not set, using localhost fallback');
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

export function validateMongoUri(uri: string | undefined): void {
  if (!uri) {
    if (isProd) {
      throw new Error('FATAL: MONGODB_URI is required in production');
    }
    return;
  }
  
  assertNotLocalhostInProd(uri);
}
