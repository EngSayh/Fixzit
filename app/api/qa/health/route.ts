import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { connectMongo, isMockDB } from '@/src/lib/mongo';
=======
import { connectDb, isMockDB } from '@/src/lib/mongo';
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b

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

  // Check database connectivity
  try {
    if (isMockDB) {
      healthStatus.database = 'mock-connected';
      healthStatus.status = 'healthy';
    } else {
<<<<<<< HEAD
      const connection = await connectMongo();
=======
      await connectDb();
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
      healthStatus.database = 'connected';

      // Test database query only if not mock
      try {
<<<<<<< HEAD
        const collections = await connection?.connection.db.listCollections().toArray();
        healthStatus.database = `connected (${collections?.length ?? 0} collections)`;
=======
        const mongoose = await connectDb();
        const collections = await (mongoose as any).connection.db.listCollections().toArray();
        healthStatus.database = `connected (${collections.length} collections)`;
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
      } catch {
        healthStatus.database = 'connected (query failed)';
      }
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
  } else if (healthStatus.database.startsWith('connected') || healthStatus.database === 'mock-connected') {
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
<<<<<<< HEAD
      await connectMongo();
=======
      await connectDb();
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
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
