/**
 * Database Diagnostic Endpoint
 * GET /api/health/db-diag
 * 
 * Returns detailed database connection diagnostics for troubleshooting.
 * SECURITY: Requires X-Health-Token header matching HEALTH_CHECK_TOKEN.
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { db } from "@/lib/mongo";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Only allow authorized requests
  if (!isAuthorizedHealthRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized - provide X-Health-Token header" },
      { status: 401 }
    );
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || "unknown",
  };

  // Check env var presence (not values for security)
  diagnostics.envVars = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0,
    MONGODB_URI_STARTS: process.env.MONGODB_URI?.substring(0, 20) || "NOT_SET",
    MONGODB_DB: process.env.MONGODB_DB || "fixzit",
  };

  // Test 1: Direct MongoClient connection
  diagnostics.directConnection = await testDirectConnection();

  // Test 2: Mongoose connection state
  diagnostics.mongoose = {
    readyState: mongoose.connection.readyState,
    readyStateText: getReadyStateText(mongoose.connection.readyState),
    host: mongoose.connection.host || "not connected",
    name: mongoose.connection.name || "not connected",
  };

  // Test 3: Try to await the db promise from lib/mongo.ts
  diagnostics.libMongoDb = await testLibMongoDb();

  // Test 4: Try to connect via mongoose if not connected
  if (mongoose.connection.readyState !== 1) {
    diagnostics.mongooseConnect = await testMongooseConnect();
  }

  // Determine success status from directConnection result
  const directConn = diagnostics.directConnection as { success?: boolean } | undefined;
  const isHealthy = directConn?.success === true;

  return NextResponse.json(diagnostics, {
    status: isHealthy ? 200 : 503,
  });
}

function getReadyStateText(state: number): string {
  switch (state) {
    case 0: return "disconnected";
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return "unknown";
  }
}

async function testDirectConnection(): Promise<Record<string, unknown>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { success: false, error: "MONGODB_URI not set" };
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  const start = Date.now();
  try {
    await client.connect();
    const db = client.db("fixzit");
    const adminDb = db.admin();
    await adminDb.ping();
    const latency = Date.now() - start;
    
    // Get collection count
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return {
      success: true,
      latencyMs: latency,
      collectionCount: collections.length,
    };
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "Unknown",
    };
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

async function testMongooseConnect(): Promise<Record<string, unknown>> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { success: false, error: "MONGODB_URI not set" };
  }

  const start = Date.now();
  try {
    // Don't actually connect - just check if we can parse the URI
    return {
      success: false,
      note: "Mongoose not connected - check lib/mongo.ts initialization",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testLibMongoDb(): Promise<Record<string, unknown>> {
  const start = Date.now();
  try {
    // Try to await the db promise from lib/mongo.ts
    const database = await db;
    const latency = Date.now() - start;
    
    if (database && typeof database.collection === "function") {
      return {
        success: true,
        latencyMs: latency,
        hasCollectionMethod: true,
        mongooseReadyState: mongoose.connection.readyState,
      };
    }
    
    return {
      success: false,
      latencyMs: latency,
      note: "db resolved but no collection method",
    };
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "Unknown",
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
    };
  }
}
