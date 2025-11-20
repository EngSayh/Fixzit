import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

/**
 * Server-only logging endpoint for DataDog integration
 * 
 * SECURITY: DataDog API keys are kept server-side only
 * Client components call this endpoint instead of directly accessing DataDog
 * 
 * POST /api/logs
 * Body: level (info/warn/error), message (string), context (optional object)
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Require authentication for production logging
    const session = await auth();
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { level, message, context } = body;

    // Validate input
    if (!level || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: level, message' },
        { status: 400 }
      );
    }

    if (!['info', 'warn', 'error'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be info, warn, or error' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: DataDog keys only accessible server-side
    if (process.env.DATADOG_API_KEY) {
      try {
        await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': process.env.DATADOG_API_KEY,
          },
          body: JSON.stringify({
            ddsource: 'fixzit',
            service: 'web-app',
            hostname: req.headers.get('host') || 'unknown',
            level,
            message,
            timestamp: new Date().toISOString(),
            user: session?.user?.email || 'anonymous',
            ...context,
          }),
        });
      } catch (ddError) {
        // Silent fail - don't break app if DataDog is unreachable
        logger.error('Failed to send log to DataDog', { error: ddError });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Logging endpoint error', { error });
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
}
