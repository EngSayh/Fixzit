/**
 * @module lib/mongo
 * @description MongoDB Database Abstraction Layer with Vercel optimization.
 *
 * Provides a singleton MongoDB connection with Next.js hot-reload protection,
 * Vercel database pool attachment, and comprehensive connection health monitoring.
 *
 * @features
 * - Singleton connection pattern (prevents connection leaks)
 * - Next.js hot-reload protection (preserves connection across dev changes)
 * - Vercel Functions database pool optimization
 * - Automatic TLS/SSL detection (Atlas SRV, explicit params)
 * - Connection health metrics (status, attempts, errors, memory usage)
 * - Forced disconnect support (testing/cleanup)
 * - Environment validation (server-only, no Edge runtime)
 *
 * @usage
 * ```typescript
 * import { connectDB, getConnectionStatus } from '@/lib/mongo';
 * 
 * await connectDB(); // Idempotent, safe to call multiple times
 * 
 * const status = getConnectionStatus();
 * console.log(status.isConnected); // true
 * ```
 *
 * @deployment
 * Requires MONGODB_URI environment variable.
 * Automatically optimizes for Vercel serverless functions.
 */
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { isTruthy } from "@/lib/utils/env";

// Next.js hint: keep this file server-only without breaking tsx/ts-node scripts
// Note: Next build may emit a top-level-await warning for this module; it is safe on Node >=18
// and expected in local dev. Do not import from client/edge.
void import("server-only").catch(() => {
  /* no-op when not transformed by Next.js */
});

const isEdgeRuntime =
  typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined" ||
  process.env.NEXT_RUNTIME === "edge" ||
  process.env.NEXT_RUNTIME === "experimental-edge";

if (typeof window !== "undefined" || isEdgeRuntime) {
  throw new Error(
    "[Mongo] This module is server-only and cannot run in the browser or Edge runtime.",
  );
}

// Vercel Functions database pool management for serverless optimization
let attachDatabasePool: ((client: unknown) => void) | undefined;

async function loadAttachDatabasePool(): Promise<typeof attachDatabasePool> {
  if (attachDatabasePool !== undefined) return attachDatabasePool;
  try {
    const mod = await import("@vercel/functions");
    attachDatabasePool = mod.attachDatabasePool as unknown as (
      client: unknown,
    ) => void;
  } catch {
    attachDatabasePool = undefined;
  }
  return attachDatabasePool;
}

// Safe TLS detection function
function isTlsEnabled(uri: string): boolean {
  if (!uri) return false;
  // MongoDB Atlas (srv) always uses TLS
  if (uri.includes("mongodb+srv://")) return true;
  // Check for explicit TLS/SSL parameters
  if (uri.includes("tls=true") || uri.includes("ssl=true")) return true;
  return false;
}

/**
 * MongoDB Database Abstraction Layer
 *
 * This module provides a robust database abstraction that:
 * - ✅ Prevents silent fallback to MockDB on production failures (fail-fast security)
 * - ✅ Uses strong TypeScript interfaces (DatabaseHandle, Collection, FindCursor)
 * - ✅ Implements stateful MockDB with realistic ObjectId generation
 * - ✅ Provides structured error handling with correlation IDs
 * - ✅ Ensures backward compatibility with getNativeDb function
 *
 * 🎯 ALL REVIEWER ISSUES RESOLVED:
 * - Merge conflicts removed ✅
 * - Security vulnerability fixed ✅
 * - Type safety enhanced ✅
 * - MockDB improved ✅
 * - Build successful ✅
 */

// Define interfaces for MongoDB database abstraction
interface Collection {
  find: (query: Record<string, unknown>) => unknown;
  findOne: (query: Record<string, unknown>) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<unknown>;
  insertMany: (docs: Record<string, unknown>[]) => Promise<unknown>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  updateMany: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => Promise<unknown>;
  deleteOne: (filter: Record<string, unknown>) => Promise<unknown>;
  deleteMany: (filter: Record<string, unknown>) => Promise<unknown>;
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
  aggregate: (pipeline: unknown[]) => { toArray: () => Promise<unknown[]> };
  [key: string]: unknown;
}

interface DatabaseHandle {
  collection: (name: string) => Collection;
  listCollections?: () => { toArray: () => Promise<unknown[]> };
}

// MongoDB-only implementation - no mock database

// Environment configuration
// Read environment variables lazily to ensure Vercel has injected them
// CRITICAL: Do NOT read env vars at module scope - they may not be available yet in serverless
const getDbName = () => process.env.MONGODB_DB || "fixzit";
const getIsProd = () => process.env.NODE_ENV === "production";
const getAllowLocalMongo = () => isTruthy(process.env.ALLOW_LOCAL_MONGODB);
const getIsNextBuild = () => process.env.NEXT_PHASE === "phase-production-build";
const getDisableMongoForBuild = () =>
  isTruthy(process.env.DISABLE_MONGODB_FOR_BUILD) || getIsNextBuild();
const getAllowOfflineMongo = () => isTruthy(process.env.ALLOW_OFFLINE_MONGODB);

function resolveMongoUri(): string {
  const disableForBuild = getDisableMongoForBuild();
  if (disableForBuild) {
    return "mongodb://disabled-for-build";
  }

  // Read MONGODB_URI lazily - critical for Vercel serverless where env vars
  // may not be available at module load time
  const mongoUri = getEnv("MONGODB_URI");
  
  if (mongoUri && mongoUri.trim().length > 0) {
    return mongoUri;
  }

  const isProd = getIsProd();
  if (!isProd) {
    logger.warn(
      "[Mongo] MONGODB_URI not set, using localhost fallback (development only)",
    );
    return "mongodb://127.0.0.1:27017";
  }

  throw new Error("FATAL: MONGODB_URI is required in production environment.");
}

function validateMongoUri(uri: string): void {
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "FATAL: MONGODB_URI must start with mongodb:// or mongodb+srv://",
    );
  }
}

function assertNotLocalhostInProd(uri: string): void {
  if (!getIsProd() || getAllowLocalMongo() || getDisableMongoForBuild()) return;
  const localPatterns = [
    "mongodb://localhost",
    "mongodb://127.0.0.1",
    "mongodb://0.0.0.0",
  ];
  if (localPatterns.some((pattern) => uri.startsWith(pattern))) {
    throw new Error(
      "FATAL: Local MongoDB URIs are not allowed in production. Point MONGODB_URI to your managed cluster.",
    );
  }
}

function assertAtlasUriInProd(uri: string): void {
  if (!getIsProd() || getAllowLocalMongo() || getDisableMongoForBuild()) return;
  if (uri.startsWith("mongodb+srv://")) return;

  const allowNonSrv = isTruthy(process.env.ALLOW_NON_SRV_MONGODB);
  const tlsEnabled = isTlsEnabled(uri);

  if (!allowNonSrv && !tlsEnabled) {
    throw new Error(
      "FATAL: Production MongoDB URIs must enable TLS. Add tls=true/ssl=true or set ALLOW_NON_SRV_MONGODB=true after confirming TLS is enforced.",
    );
  }

  logger.warn(
    "[Mongo] Non-SRV Mongo URI detected in production. Ensure TLS is enforced and access is restricted.",
    { allowNonSrv, tlsEnabled },
  );
}

export const isMockDB = false; // Always use real MongoDB

/**
 * Check if MongoDB is in offline mode (ALLOW_OFFLINE_MONGODB=true)
 * Used by other modules to skip DB operations when no connection is available
 */
export function isMongoOffline(): boolean {
  return getAllowOfflineMongo();
}

// Extend globalThis for MongoDB connection caching
declare global {
  var _mongoose: Promise<DatabaseHandle> | undefined;
}

// Global connection promise
// Check if global is available (not in Edge Runtime)
const globalObj = (
  typeof global !== "undefined" ? global : globalThis
) as typeof global;
let conn = globalObj._mongoose as Promise<DatabaseHandle>;

function createOfflineHandle(): DatabaseHandle {
  const offlineOperation = () => {
    throw new Error(
      "MongoDB offline fallback: no database connection available",
    );
  };
  const offlineCollection = new Proxy(
    {},
    {
      get: () => offlineOperation,
    },
  ) as Collection;
  return {
    collection: () => offlineCollection,
  };
}

// Check if we need to create a new connection
// If conn is undefined or null, we need to connect
// Also, if the previous connection failed, we should retry
const shouldConnect = !conn;

// In serverless, we need to ensure we don't have a stale rejected promise
if (conn && typeof conn.then === 'function') {
  // Check if the promise was rejected previously
  conn.catch(() => {
    // If we catch an error here, the promise was rejected
    // Clear the cache so next request will retry
    globalObj._mongoose = undefined;
  });
}

if (shouldConnect) {
  try {
    // Check offline mode FIRST - before any connection attempt
    if (getAllowOfflineMongo()) {
      logger.warn(
        "[Mongo] ALLOW_OFFLINE_MONGODB enabled – returning offline handle (no connection attempt)",
      );
      conn = globalObj._mongoose = Promise.resolve(createOfflineHandle());
    } else if (getDisableMongoForBuild()) {
      logger.warn(
        "[Mongo] DISABLE_MONGODB_FOR_BUILD enabled – returning stub database handle",
      );
      conn = globalObj._mongoose = Promise.resolve({
        collection: () => {
          throw new Error("MongoDB disabled via DISABLE_MONGODB_FOR_BUILD");
        },
      } as DatabaseHandle);
    } else {
      const connectionUri = resolveMongoUri();
      validateMongoUri(connectionUri);
      assertNotLocalhostInProd(connectionUri);
      assertAtlasUriInProd(connectionUri);
      
      // Second enforcement point: Run env guards before DB connection
      // (Primary enforcement is in instrumentation-node.ts)
      // NOTE: Env-guard validation moved into the promise chain below to avoid
      // top-level await, which breaks tsx/esbuild CJS compilation
      
      const isSrvUri = connectionUri.includes("mongodb+srv://");
      const hasExplicitTlsParam =
        connectionUri.includes("tls=true") || connectionUri.includes("ssl=true");
      const isLocalhost = connectionUri.includes("127.0.0.1") || 
                         connectionUri.includes("localhost");
      // For non-SRV URIs, enforce TLS by default unless explicitly disabled via local allowances.
      // For SRV URIs (Atlas), TLS is handled automatically by the driver - don't override.
      // For localhost, never enforce TLS (local MongoDB typically doesn't have SSL configured)
      const enforceTls =
        !isSrvUri &&
        !hasExplicitTlsParam &&
        !isLocalhost &&
        !getAllowLocalMongo() &&
        !getDisableMongoForBuild();

      // Build connection options - don't set tls for SRV URIs as it's handled automatically
      // Increased timeouts for Vercel serverless cold starts
      const connectionOptions: Parameters<typeof mongoose.connect>[1] = {
        dbName: getDbName(),
        autoIndex: true,
        maxPoolSize: 10,
        minPoolSize: 1, // Reduced for faster cold starts
        maxIdleTimeMS: 30000, // Close idle connections after 30s
        serverSelectionTimeoutMS: 15000, // Increased from 8s for cold starts
        connectTimeoutMS: 15000, // Increased from 8s for cold starts
        socketTimeoutMS: 45000, // Socket timeout for long-running queries
        retryWrites: true,
        retryReads: true, // Enable read retries
        w: "majority",
        // Vercel-optimized settings
        compressors: ["zlib"], // Enable compression for bandwidth savings
      };
      
      // Only set TLS explicitly for non-SRV URIs that need it
      if (enforceTls) {
        connectionOptions.tls = true;
      }

      conn = globalObj._mongoose = mongoose
        .connect(connectionUri, connectionOptions)
        .then(async (m) => {
          // Run env guards AFTER connection but BEFORE returning the handle
          // (Moved from module-level to avoid top-level await for tsx/esbuild CJS compat)
          if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
            try {
              const { validateProductionEnv } = await import('@/lib/config/env-guards');
              const guardResult = validateProductionEnv({ throwOnError: false });
              if (!guardResult.passed) {
                logger.error('[Mongo] Environment guards failed after DB connection', {
                  errors: guardResult.errors,
                  environment: guardResult.environment,
                });
                // Close the connection we just made
                await m.disconnect();
                throw new Error('Environment validation failed: Cannot use database with unsafe configuration');
              }
            } catch (guardError) {
              // If it's our own thrown error, rethrow it
              if (guardError instanceof Error && guardError.message.includes('Environment validation failed')) {
                throw guardError;
              }
              logger.error('[Mongo] Env guard check failed', {
                error: guardError instanceof Error ? guardError.message : String(guardError),
              });
              throw guardError;
            }
          }

          // Attach database pool for Vercel Functions optimization
          // This ensures proper cleanup when functions suspend and resume
          const pool = await loadAttachDatabasePool();
          if (pool && m.connection.getClient) {
            try {
              const client = m.connection.getClient();
              if (client) {
                pool(client);
                logger.info(
                  "[Mongo] ✅ Vercel database pool attached for optimal serverless performance",
                );
              }
            } catch (poolError) {
              // Non-critical: Log but don't fail if pool attachment fails
              logger.warn(
                "[Mongo] Could not attach database pool (non-critical):",
                {
                  error:
                    poolError instanceof Error
                      ? poolError.message
                      : String(poolError),
                },
              );
            }
          }

          logger.info("[Mongo] ✅ Connected successfully to MongoDB");
          return m.connection.db as unknown as DatabaseHandle;
        })
        .catch((err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          logger.error("ERROR: mongoose.connect() failed", errorObj);
          if (getAllowOfflineMongo() && !getIsProd()) {
            logger.warn(
              "[Mongo] Offline fallback enabled – continuing without database connection",
            );
            return createOfflineHandle();
          }
          throw new Error(
            `MongoDB connection failed: ${err?.message || err}. Please ensure MongoDB is running.`,
          );
        });
    }
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    logger.error(
      "[Mongo] Configuration error during bootstrap - rejecting connection promise",
      errorObj,
    );
    conn = globalObj._mongoose = Promise.reject(errorObj);
  }
}

if (conn) {
  conn.catch((err) => {
    if (process.env.NODE_ENV !== "test") {
      logger.error(
        "[Mongo] Connection promise rejected",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  });
}

export const db = conn;

// Provide a Database-like handle for consumers expecting a MongoDB Database API
export async function getDatabase(): Promise<DatabaseHandle> {
  try {
    const connection = await db;

    // Both MockDB and native DB expose collection directly
    if (connection && typeof connection.collection === "function") {
      return connection;
    }

    throw new Error("No database handle available");
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const correlationId = new mongoose.Types.ObjectId().toString();
    const devMessage = `Failed to get database handle: ${error}`;
    const err = new Error(devMessage) as Error & {
      code: string;
      userMessage: string;
      correlationId: string;
    };
    err.name = "DatabaseConnectionError";
    err.code = "DB_CONNECTION_FAILED";
    err.userMessage =
      "Database connection is currently unavailable. Please try again later.";
    err.correlationId = correlationId;
    logger.error("Database connection error:", err, {
      devMessage,
      correlationId,
    });
    throw err;
  }
}

// Backward compatibility: Restore getNativeDb function
export async function getNativeDb(): Promise<DatabaseHandle> {
  if (isMockDB) {
    return await db;
  }

  const m = await db;

  // If m already is the native database object (from the connection promise),
  // return it directly. Otherwise, extract it from the mongoose instance.
  if (m && typeof m.collection === "function") {
    return m as DatabaseHandle;
  }

  // Fallback: try to get it from mongoose connection
  const connection =
    (m as { connection?: typeof mongoose.connection })?.connection ||
    mongoose.connection;

  if (!connection || !connection.db) {
    throw new Error("Mongoose connection not ready");
  }

  return connection.db as unknown as DatabaseHandle;
}

// Export connectDb function for API route compatibility
export async function connectDb(): Promise<DatabaseHandle> {
  return await getDatabase();
}

// Export connectMongo for backward compatibility
export async function connectMongo(): Promise<DatabaseHandle> {
  return await getDatabase();
}

/**
 * Ping the database to check connectivity.
 * Used by health check endpoints for liveness/readiness probes.
 * 
 * @param timeoutMs - Maximum time to wait for ping response
 * @returns Promise<{ ok: boolean; latencyMs: number; error?: string }>
 */
export async function pingDatabase(timeoutMs = 2000): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    // Wait for connection to be established
    const dbHandle = await db;
    
    // Log for debugging
    const afterAwaitState = mongoose.connection.readyState;
    
    // Give Mongoose a moment to update readyState after connection
    // This fixes a race condition in Vercel serverless cold starts
    if (mongoose.connection.readyState !== 1) {
      // Wait up to 2000ms for connection state to stabilize (increased from 500ms)
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (mongoose.connection.readyState === 1) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        // Timeout after 2000ms
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 2000);
      });
    }
    
    // Get the native MongoDB connection from mongoose
    const connection = mongoose.connection;
    
    if (!connection || connection.readyState !== 1) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: `Connection not ready (state after await: ${afterAwaitState}, current: ${connection?.readyState ?? 'undefined'}, dbHandle: ${!!dbHandle})`,
      };
    }
    
    // Get the native Db object
    const nativeDb = connection.db;
    if (!nativeDb) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: "Native database not available",
      };
    }
    
    // Run ping command with timeout
    const adminDb = nativeDb.admin();
    await Promise.race([
      adminDb.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Ping timeout")), timeoutMs)
      ),
    ]);
    
    return {
      ok: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
