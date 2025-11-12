/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns server health status for monitoring and E2E test readiness checks
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    // Check database connection
    let dbStatus = 'disconnected';
    let dbLatency = 0;
    
    const dbStart = Date.now();
    try {
      const connection = await db;
      // Verify connection by checking if collection method exists
      if (connection && typeof connection.collection === 'function') {
        dbStatus = 'connected';
        dbLatency = Date.now() - dbStart;
      } else {
        dbStatus = 'disconnected';
      }
    } catch (dbError) {
      dbStatus = 'error';
      logger.error('[Health Check] Database error', { error: dbError });
    }
    
    const health = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error('[Health Check] Error', { error });
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
