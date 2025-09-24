import { PrismaClient } from '@prisma/client';
import { MongoClient, Db } from 'mongodb';

// PostgreSQL/Prisma connection
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// MongoDB connection
let mongoClient: MongoClient;
let mongoDb: Db;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_enterprise';

export async function connectMongoDB(): Promise<Db> {
  if (mongoDb) {
    return mongoDb;
  }

  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    console.log('✅ Connected to MongoDB');
    return mongoDb;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoDb = null as any;
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  postgres: boolean;
  mongodb: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let postgres = false;
  let mongodb = false;

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = true;
  } catch (error) {
    errors.push(`PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check MongoDB
  try {
    const db = await connectMongoDB();
    await db.admin().ping();
    mongodb = true;
  } catch (error) {
    errors.push(`MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { postgres, mongodb, errors };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await disconnectMongoDB();
});