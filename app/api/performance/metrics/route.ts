/**
 * Performance Metrics API Endpoint
 * 
 * GET /api/performance/metrics
 * 
 * Returns current performance statistics and recent metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPerformanceStats,
  getRecentMetrics,
  getExceededMetrics
} from '@/lib/performance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'stats';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);

    switch (type) {
      case 'stats':
        return NextResponse.json({
          success: true,
          data: getPerformanceStats()
        });

      case 'recent':
        return NextResponse.json({
          success: true,
          data: getRecentMetrics(limit)
        });

      case 'exceeded':
        return NextResponse.json({
          success: true,
          data: getExceededMetrics()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Use: stats, recent, or exceeded'
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
