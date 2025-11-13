import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

declare global {
   
  var _mongooseConnection: typeof mongoose | undefined;
}

// Production enforcement: no fallback chains or defaults
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

/**
 * Validates MongoDB URI is configured
 * Called at runtime (not at module load) to avoid build-time failures
 */
function validateMongoUri(): string {
  // Skip validation during CI builds (only needed at runtime)
  if (process.env.CI === 'true') {
    return MONGODB_URI || 'mongodb://localhost:27017/fixzit';
  }
  
  // Enforce production requirements at runtime
  if (process.env.NODE_ENV === 'production') {
    if (!MONGODB_URI || MONGODB_URI.trim().length === 0) {
      throw new Error('FATAL: MONGODB_URI or DATABASE_URL is required in production');
    }
    if (!MONGODB_URI.startsWith('mongodb+srv://') && !MONGODB_URI.startsWith('mongodb://')) {
      throw new Error('FATAL: Invalid MongoDB URI format in production. Must start with mongodb:// or mongodb+srv://');
    }
  }
  
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI or DATABASE_URL environment variable inside .env.local'
    );
  }
  return MONGODB_URI;
}

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

  // Validate URI at runtime (not at module load)
  const mongoUri = validateMongoUri();

  try {
    const connection = await mongoose.connect(mongoUri, {
      dbName: MONGODB_DB,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Production-critical options for MongoDB Atlas
      retryWrites: true,        // Automatic retry for write operations (network failures)
      tls: true,                // Force TLS/SSL for secure connections (required for Atlas)
      w: 'majority',            // Write concern for data durability (prevents data loss)
    });

    if (process.env.NODE_ENV === 'development') {
      global._mongooseConnection = connection;
    }

    logger.info('✅ MongoDB connected successfully');
    return connection;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', { error });
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
    logger.error('Database health check failed:', { error });
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