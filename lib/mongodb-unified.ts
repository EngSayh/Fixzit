/**
 * @module lib/mongodb-unified
 * @description Server-only MongoDB connector with build/edge guards and shared singleton for Next.js.
 *
 * @features
 * - Prevents browser/Edge runtime usage (throws fast)
 * - Build-safe toggles: DISABLE_MONGODB_FOR_BUILD / ALLOW_MONGODB_DURING_BUILD
 * - Offline/CI shortcut via ALLOW_OFFLINE_MONGODB
 * - Singleton connection caching + health checks
 *
 * @performance
 * - Avoids repeated connections; reuses global mongoose handle in dev
 *
 * @security
 * - Explicit build disablement to avoid leaking credentials during builds
 */

import { logger } from "@/lib/logger";
import {
    db,
    connectMongo as ensureDatabaseHandle,
    isMongoOffline,
    pingDatabase,
} from "@/lib/mongo";
import { isTruthy } from "@/lib/utils/env";
import mongoose from "mongoose";

/**
 * Re-exported database utilities from the underlying mongo.ts module.
 *
 * @property {() => Promise<{ ok: boolean; latencyMs?: number }>} pingDatabase - Health check that pings the database
 * @property {() => Promise<Db>} db - Async function returning the native MongoDB Db instance
 * @property {() => boolean} isMongoOffline - Returns true if MongoDB is in offline/build mode
 *
 * @see {@link @/lib/mongo} for implementation details
 */
export { db, isMongoOffline, pingDatabase };

// Next.js hint: keep this file server-only without breaking tsx/ts-node scripts
void import("server-only").catch(() => {
  /* no-op when not transformed by Next.js */
});

const isEdgeRuntime =
  typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined" ||
  process.env.NEXT_RUNTIME === "edge" ||
  process.env.NEXT_RUNTIME === "experimental-edge";

if (typeof window !== "undefined" || isEdgeRuntime) {
  throw new Error(
    "[MongoDB] This module is server-only and cannot run in the browser or Edge runtime.",
  );
}

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
  // Offline/CI shortcut: avoid actual MongoDB connection attempts
  if (isTruthy(process.env.ALLOW_OFFLINE_MONGODB)) {
    logger.warn(
      "[MongoDB] Skipping connection (ALLOW_OFFLINE_MONGODB=true) - returning mock mongoose handle",
    );
    return mongoose;
  }

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
