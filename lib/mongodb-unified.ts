import { logger } from "@/lib/logger";
import mongoose from "mongoose";
import { connectMongo as ensureDatabaseHandle } from "@/lib/mongo";

const isTruthy = (value?: string): boolean =>
  value === "true" || value === "1";

declare global {
  var _mongooseConnection: typeof mongoose | undefined;
}

const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const disableMongoForBuild =
  isTruthy(process.env.DISABLE_MONGODB_FOR_BUILD) ||
  (isNextBuildPhase && !isTruthy(process.env.ALLOW_MONGODB_DURING_BUILD));
let connectPromise: Promise<typeof mongoose> | null = null;

function createBuildDisabledError(): Error & { code: string } {
  const error = new Error(
    "MongoDB connections are disabled during build (DISABLE_MONGODB_FOR_BUILD/phase-production-build). Set ALLOW_MONGODB_DURING_BUILD=true to override.",
  ) as Error & { code: string };
  error.code = "MONGO_DISABLED_FOR_BUILD";
  return error;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (disableMongoForBuild) {
    throw createBuildDisabledError();
  }

  if (globalThis._mongooseConnection && mongoose.connection.readyState === 1) {
    return globalThis._mongooseConnection;
  }

  if (!connectPromise) {
    connectPromise = ensureDatabaseHandle()
      .then(() => {
        if (process.env.NODE_ENV === "development") {
          globalThis._mongooseConnection = mongoose;
        }
        logger.info("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((error: unknown) => {
        connectPromise = null;
        logger.error(
          "[MongoDB] Connection failed",
          error instanceof Error ? error : undefined,
        );
        throw error;
      });
  }

  return connectPromise;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (disableMongoForBuild) {
    connectPromise = null;
    return;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectPromise = null;
    globalThis._mongooseConnection = undefined;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  if (disableMongoForBuild) {
    logger.warn(
      "[MongoDB] Health check skipped because database access is disabled for build.",
    );
    return true;
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    await mongoose.connection.db.admin().ping();
    return true;
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error(
      "Database health check failed",
      error instanceof Error ? error : undefined,
    );
    return false;
  }
}

export type ConnectionDb = NonNullable<typeof mongoose.connection.db>;

export async function getDatabase(): Promise<ConnectionDb> {
  if (disableMongoForBuild) {
    throw createBuildDisabledError();
  }

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database not available");
  }
  return db as ConnectionDb;
}

export async function getMongooseConnection() {
  return await connectToDatabase();
}

export const connectDb = connectToDatabase;
export const dbConnect = connectToDatabase;
export const connectMongo = connectToDatabase;

export default connectToDatabase;
