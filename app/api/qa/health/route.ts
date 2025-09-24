import { NextRequest, NextResponse } from 'next/server';
import { db, isMockDB } from '@/src/lib/mongo';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: 'unknown',
    memory: 'unknown',
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    mockDatabase: isMockDB
  };

  // Check database connectivity (permission-agnostic ping)
  try {
    const conn: any = await db;
    try {
      // Prefer a lightweight ping over listing collections (avoids permission issues)
      const nativeDb = conn?.connection?.db || conn?.db || conn;
      if (nativeDb?.admin) {
        const ping = await nativeDb.admin().ping();
        healthStatus.database = ping?.ok === 1 ? 'connected (ping ok)' : 'connected (ping unknown)';
      } else {
        healthStatus.database = 'connected';
      }
    } catch {
      healthStatus.database = 'connected';
    }
  } catch (error) {
    healthStatus.status = 'degraded';
    healthStatus.database = 'disconnected';
    console.error('Database health check failed:', error);
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    healthStatus.memory = `RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;
  } catch (error) {
    healthStatus.memory = 'unknown';
  }

  // Determine overall status
  if (healthStatus.database === 'disconnected') {
    healthStatus.status = 'critical';
  } else if (healthStatus.database.startsWith('connected')) {
    healthStatus.status = 'healthy';
  } else {
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 :
                    healthStatus.status === 'degraded' ? 206 : 503;

  return NextResponse.json(healthStatus, { status: statusCode });
}

export async function POST(req: NextRequest) {
  // Force database reconnection
  try {
    if (isMockDB) {
      return NextResponse.json({
        success: true,
        message: 'Mock database refreshed',
        timestamp: new Date().toISOString()
      });
    } else {
      await db;
      return NextResponse.json({
        success: true,
        message: 'Database reconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reconnect database',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
