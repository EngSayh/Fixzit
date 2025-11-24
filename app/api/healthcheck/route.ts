import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/healthcheck
 * Returns application health status for monitoring systems
 * Public endpoint - no authentication required
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'fixzit-api'
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  );
}
