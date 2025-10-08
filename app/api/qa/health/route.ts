import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/lib/mongodb-unified";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/qa/health:
 *   get:
 *     summary: qa/health operations
 *     tags: [qa]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: 'unknown',
    memory: 'unknown',
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    mockDatabase: false
  };

  // Check database connectivity
  try {
    await connectToDatabase();
    healthStatus.database = 'connected';

    // Test database query
    try {
      const mongoose = await connectToDatabase();
      const collections = await (mongoose as any).connection.db.listCollections().toArray();
      healthStatus.database = `connected (${collections.length} collections)`;
    } catch {
      healthStatus.database = 'connected (query failed)';
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
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // Force database reconnection
  try {
    await connectToDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database reconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reconnect database',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

