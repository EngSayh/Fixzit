import { prisma } from './prisma';
import { MongoClient, Db } from 'mongodb';

export { prisma };

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
const cleanup = async () => {
  try {
    await prisma.$disconnect();
    await disconnectMongoDB();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
};

process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  await cleanup();
  process.exit(1);
});