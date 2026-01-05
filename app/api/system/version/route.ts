/**
 * @fileoverview System Version API
 * @description Returns current build version for client-side version detection
 * @route GET /api/system/version
 * @access Public (no auth required)
 * @module api/system/version
 */

import { NextResponse } from "next/server";

/**
 * GET /api/system/version
 * Returns current build information for version monitoring
 */

// CRITICAL FIX: Use a stable buildId in development to prevent infinite reload loops
// The old `dev-${Date.now()}` caused version checks to always return a "new" version,
// triggering the VersionMonitorContext's auto-reload feature every 30 seconds.
const STABLE_DEV_BUILD_ID = "dev-local";

export async function GET() {
  // Use stable buildId: prefer explicit env vars, fall back to stable dev ID (not Date.now()!)
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 
                  process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) ||
                  STABLE_DEV_BUILD_ID;
  
  const deployedAt = process.env.VERCEL_ENV 
    ? new Date().toISOString() 
    : new Date().toISOString();
  
  const environment = 
    process.env.VERCEL_ENV || 
    process.env.NODE_ENV || 
    "development";
  
  const response = {
    buildId,
    deployedAt,
    environment,
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
    serverTime: new Date().toISOString(),
  };
  
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
