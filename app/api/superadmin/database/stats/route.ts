/**
 * @fileoverview Superadmin Database Stats API
 * @description GET database statistics and health information
 * @route GET /api/superadmin/database/stats
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/database/stats
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface CollectionStats {
  name: string;
  count: number;
  size: number;
  avgObjSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
}

/**
 * GET /api/superadmin/database/stats
 * Get database statistics
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-database-stats:get",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();
    
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 503, headers: ROBOTS_HEADER }
      );
    }

    // Get database stats
    const dbStats = await db.command({ dbStats: 1 });

    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Get stats for each collection
    const collectionStats: CollectionStats[] = [];
    for (const coll of collections) {
      try {
        const stats = await db.command({ collStats: coll.name });
        collectionStats.push({
          name: coll.name,
          count: stats.count || 0,
          size: stats.size || 0,
          avgObjSize: stats.avgObjSize || 0,
          storageSize: stats.storageSize || 0,
          indexes: stats.nindexes || 0,
          indexSize: stats.totalIndexSize || 0,
        });
      } catch {
        // Some collections might not have stats (views, etc.)
        collectionStats.push({
          name: coll.name,
          count: 0,
          size: 0,
          avgObjSize: 0,
          storageSize: 0,
          indexes: 0,
          indexSize: 0,
        });
      }
    }

    // Sort by size descending
    collectionStats.sort((a, b) => b.size - a.size);

    // Server status info (connection pool, memory, ops counters)
    const serverStatus = await db.command({ serverStatus: 1 });

    const connectionInfo = {
      current: serverStatus.connections?.current || 0,
      available: serverStatus.connections?.available || 0,
      totalCreated: serverStatus.connections?.totalCreated || 0,
      // Health-related fields
      connected: mongoose.connection.readyState === 1,
      latency: 0, // Will be computed below
    };

    // Memory info
    const memoryInfo = {
      resident: serverStatus.mem?.resident || 0,
      virtual: serverStatus.mem?.virtual || 0,
      mapped: serverStatus.mem?.mapped || 0,
    };

    // Ops counters
    const opsCounters = {
      insert: serverStatus.opcounters?.insert || 0,
      query: serverStatus.opcounters?.query || 0,
      update: serverStatus.opcounters?.update || 0,
      delete: serverStatus.opcounters?.delete || 0,
      getmore: serverStatus.opcounters?.getmore || 0,
      command: serverStatus.opcounters?.command || 0,
    };

    return NextResponse.json(
      {
        database: {
          name: dbStats.db,
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
          avgObjSize: dbStats.avgObjSize,
          fsUsedSize: dbStats.fsUsedSize,
          fsTotalSize: dbStats.fsTotalSize,
        },
        collections: collectionStats,
        connections: connectionInfo,
        memory: memoryInfo,
        operations: opsCounters,
        uptime: serverStatus.uptime || 0,
        version: serverStatus.version || "unknown",
        ok: dbStats.ok === 1,
        // Health object for frontend compatibility
        health: {
          connected: connectionInfo.connected,
          latency: connectionInfo.latency || 0,
          replicaSet: serverStatus.repl?.setName || null,
          version: serverStatus.version || "unknown",
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:DatabaseStats] Error fetching stats", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
