/**
 * Database Diagnostic Endpoint (TEMPORARY)
 * DELETE THIS FILE AFTER DEBUGGING
 * 
 * @deprecated Remove after fixing production DB connection
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    mongooseReadyState: mongoose.connection.readyState,
    readyStateDesc: getReadyStateDesc(mongoose.connection.readyState),
  };

  // Check if MONGODB_URI is set
  try {
    const uri = getEnv("MONGODB_URI");
    diagnostics.mongoUriSet = !!uri;
    diagnostics.mongoUriPrefix = uri ? uri.substring(0, 20) + "..." : "NOT_SET";
    diagnostics.mongoUriLength = uri?.length ?? 0;
  } catch (err) {
    diagnostics.mongoUriError = err instanceof Error ? err.message : String(err);
  }

  // Check connection
  try {
    if (mongoose.connection.readyState === 0) {
      diagnostics.connectionStatus = "disconnected";
      
      // Try to connect
      const uri = getEnv("MONGODB_URI");
      if (uri) {
        diagnostics.attemptingConnection = true;
        const startTime = Date.now();
        
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        
        diagnostics.connectionTime = Date.now() - startTime;
        diagnostics.connectionStatus = "connected";
        diagnostics.newReadyState = mongoose.connection.readyState;
      }
    } else if (mongoose.connection.readyState === 1) {
      diagnostics.connectionStatus = "already_connected";
      
      // Try ping
      const db = mongoose.connection.db;
      if (db) {
        const startTime = Date.now();
        const result = await db.admin().ping();
        diagnostics.pingTime = Date.now() - startTime;
        diagnostics.pingResult = result;
      } else {
        diagnostics.dbObject = "null";
      }
    } else {
      diagnostics.connectionStatus = "intermediate_state";
    }
  } catch (err) {
    diagnostics.connectionError = err instanceof Error ? err.message : String(err);
    diagnostics.errorName = err instanceof Error ? err.name : "Unknown";
    diagnostics.errorStack = err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

function getReadyStateDesc(state: number): string {
  switch (state) {
    case 0: return "disconnected";
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return "unknown";
  }
}
