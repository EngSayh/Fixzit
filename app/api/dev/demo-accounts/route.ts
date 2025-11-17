import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
export async function GET() {
  // SECURITY: Demo accounts ONLY allowed in strict development mode
  // Historical context: ENABLED flag allowed production demo mode via env var
  // CRITICAL: This endpoint exposes test credentials and should NEVER be production-accessible
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  
  try {
    // Import helpers - keeps logic DRY and secure
    const { ENABLED, listSanitized, assertDemoConfig } = await import(
      /* webpackIgnore: true */ '@/dev/credentials.server'
    );
    
    if (!ENABLED) {
      return NextResponse.json({ error: 'Demo not enabled' }, { status: 403 });
    }

    // Run sanity checks in dev (logs warnings for weak passwords/invalid emails)
    assertDemoConfig();

    // Use helper that never leaks passwords
    const sanitized = listSanitized();

    return NextResponse.json(sanitized, { 
      headers: { 'Cache-Control': 'no-store' } 
    });
  } catch (error) {
    logger.error('[Dev Demo Accounts] Failed to load credentials:', error);
    return NextResponse.json({
      demo: [],
      corporate: [],
      warning: 'credentials.server.ts not found. Copy credentials.example.ts to credentials.server.ts'
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
