import { NextResponse } from 'next/server';

const enabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';

export async function GET() {
  if (!enabled) {
    return NextResponse.json({ error: 'Demo not enabled' }, { status: 403 });
  }

  try {
    // Import on the server only - never sends passwords to client
    const { DEMO_CREDENTIALS, CORPORATE_CREDENTIALS } = await import('@/dev/credentials.server');

    // Sanitize: send NO passwords back to the client
    const sanitize = (c: any) => ({
      role: c.role,
      description: c.description,
      color: c.color ?? 'border-gray-700',
      icon: c.icon ?? 'User',
      loginType: c.loginType,
      // Identifying fields (email/employeeNumber) are safe to display in dev
      email: c.loginType === 'personal' ? c.email : undefined,
      employeeNumber: c.loginType === 'corporate' ? c.employeeNumber : undefined,
    });

    return NextResponse.json({
      demo: DEMO_CREDENTIALS.map(sanitize),
      corporate: CORPORATE_CREDENTIALS.map(sanitize),
    }, { 
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
