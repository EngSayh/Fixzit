import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var _mongooseConnection: typeof mongoose | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI or DATABASE_URL environment variable inside .env.local'
  );
}

// Type assertion after validation
const validMongoUri = MONGODB_URI as string;

/**
 * Unified MongoDB Connection Utility
 * 
 * This replaces the inconsistent connection patterns found in:
 * - src/lib/mongo.ts (complex abstraction with MockDB)
 * - src/db/mongoose.ts (mongoose-specific)  
 * - lib/database.ts (native client + legacy DB references)
 * 
 * Features:
 * ✅ Single connection pattern across the system
 * ✅ Development caching with global connection
 * ✅ Production-ready with proper error handling
 * ✅ TypeScript interfaces for consistency
 * ✅ Graceful connection management
 */

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (global._mongooseConnection && mongoose.connection.readyState === 1) {
    return global._mongooseConnection;
  }

  try {
    const connection = await mongoose.connect(validMongoUri, {
      dbName: MONGODB_DB,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    if (process.env.NODE_ENV === 'development') {
      global._mongooseConnection = connection;
    }

    console.log('✅ MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    global._mongooseConnection = undefined;
  }
}

// Connection health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get native MongoDB database instance (for direct operations)
export async function getDatabase() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not available');
  }
  return db;
}

// Get Mongoose connection (for ODM operations)
export async function getMongooseConnection() {
  return await connectToDatabase();
}

// Legacy compatibility functions
export const connectDb = connectToDatabase;
export const dbConnect = connectToDatabase;
export const connectMongo = connectToDatabase; // Fix for connectMongo import error

export default connectToDatabase;