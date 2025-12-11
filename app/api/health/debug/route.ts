/**
 * Health Debug Endpoint (TEMPORARY - REMOVE AFTER FIXING)
 * GET /api/health/debug
 *
 * Returns detailed MongoDB connection diagnostics for troubleshooting.
 * SECURITY: Requires X-Health-Token header matching HEALTH_CHECK_TOKEN.
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Return 404 if token not configured (hide endpoint in production)
  if (!process.env.HEALTH_CHECK_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow authorized requests with valid token
  if (!isAuthorizedHealthRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized - provide X-Health-Token header" },
      { status: 401 }
    );
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    mongooseConnectionState: mongoose.connection.readyState,
    mongooseConnectionStateLabel: getConnectionStateLabel(mongoose.connection.readyState),
  };

  // Check if MONGODB_URI is set (don't expose the actual value)
  const mongoUri = process.env.MONGODB_URI;
  diagnostics.mongodbUriConfigured = Boolean(mongoUri && mongoUri.length > 0);
  diagnostics.mongodbUriLength = mongoUri?.length ?? 0;
  diagnostics.mongodbUriPrefix = mongoUri ? mongoUri.substring(0, 20) + "..." : "NOT_SET";

  // Try to connect and capture any errors
  try {
    if (mongoose.connection.readyState === 0) {
      // Not connected - try to diagnose why
      diagnostics.attemptingConnection = true;
      
      if (!mongoUri) {
        diagnostics.error = "MONGODB_URI is not set";
      } else {
        // Try a raw connection to see the actual error
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        
        try {
          await client.connect();
          const db = client.db("fixzit");
          await db.command({ ping: 1 });
          diagnostics.rawConnectionResult = "SUCCESS";
          await client.close();
        } catch (connError) {
          diagnostics.rawConnectionResult = "FAILED";
          diagnostics.rawConnectionError = connError instanceof Error 
            ? { message: connError.message, name: connError.name }
            : String(connError);
        }
      }
    } else if (mongoose.connection.readyState === 1) {
      // Connected - try ping
      try {
        await mongoose.connection.db?.command({ ping: 1 });
        diagnostics.pingResult = "SUCCESS";
      } catch (pingError) {
        diagnostics.pingResult = "FAILED";
        diagnostics.pingError = pingError instanceof Error 
          ? pingError.message 
          : String(pingError);
      }
    }
  } catch (error) {
    diagnostics.diagnosticError = error instanceof Error 
      ? { message: error.message, stack: error.stack?.split("\n").slice(0, 5) }
      : String(error);
  }

  // Check Vercel region
  diagnostics.vercelRegion = process.env.VERCEL_REGION || "unknown";
  diagnostics.vercelEnv = process.env.VERCEL_ENV || "unknown";

  return NextResponse.json(diagnostics, { status: 200 });
}

function getConnectionStateLabel(state: number): string {
  switch (state) {
    case 0: return "disconnected";
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return `unknown(${state})`;
  }
}
