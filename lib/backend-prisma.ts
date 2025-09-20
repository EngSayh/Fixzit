import { PrismaClient } from '@prisma/client';

/**
 * Backend-only Prisma client for API routes
 * This file should NEVER be imported by client-side code
 */

declare global {
  // Allow global `prisma` in development to prevent exhausting connections
  var prisma: PrismaClient | undefined;
}

// Singleton Prisma Client to prevent connection exhaustion
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

// Use global in development to prevent multiple instances
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const backendPrisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = backendPrisma;
}

// Export types for better TypeScript support
export type { PrismaClient } from '@prisma/client';