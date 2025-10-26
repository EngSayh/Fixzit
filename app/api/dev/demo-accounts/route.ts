import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Import helpers - keeps logic DRY and secure
    const { ENABLED, listSanitized, assertDemoConfig } = await import('@/dev/credentials.server');
    
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
    console.error('[Dev Demo Accounts] Failed to load credentials:', error);
    return NextResponse.json({
      demo: [],
      corporate: [],
      warning: 'credentials.server.ts not found. Copy credentials.example.ts to credentials.server.ts'
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
