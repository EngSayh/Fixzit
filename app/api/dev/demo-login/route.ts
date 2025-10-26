import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side demo login endpoint
 * Keeps passwords on the server, performs login internally, sets cookies
 */
export async function POST(req: NextRequest) {
  try {
    // Import helpers - runtime check + lookup
    const { ENABLED, findLoginPayloadByRole } = await import('@/dev/credentials.server');
    
    if (!ENABLED) {
      return NextResponse.json({ error: 'Demo not enabled' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { role } = body as { role?: string };
    
    if (!role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 });
    }

    // Use helper to lookup credentials by role (server-side only)
    const payload = findLoginPayloadByRole(role);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unknown role' }, { status: 404 });
    }

    // Build login payload WITHOUT exposing password to client
    const loginData =
      payload.loginType === 'personal'
        ? { email: payload.email, password: payload.password, loginType: 'personal' }
        : { employeeNumber: payload.employeeNumber, password: payload.password, loginType: 'corporate' };

    // Call existing auth endpoint on the server side so cookies/session are set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    const url = new URL('/api/auth/login', baseUrl);

    const headers: HeadersInit = { 
      'Content-Type': 'application/json',
      'cookie': req.headers.get('cookie') ?? '',
    };

    // Optional: attach x-org-id header if orgId is set (for tenant-aware tests)
    if (payload.orgId) {
      headers['x-org-id'] = payload.orgId;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(loginData),
      redirect: 'manual',
    });

    // Forward Set-Cookie headers so the browser session is established
    const data = await safeJson(resp);
    const res = NextResponse.json({
      ...data,
      preferredPath: payload.preferredPath, // client can redirect here if desired
    }, { status: resp.status });
    
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) {
      res.headers.set('set-cookie', setCookie);
    }

    return res;
  } catch (error) {
    console.error('[Dev Demo Login] Error:', error);
    return NextResponse.json({ 
      error: 'Login failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function safeJson(resp: Response) {
  try { 
    return await resp.json(); 
  } catch { 
    return { ok: resp.ok, status: resp.status }; 
  }
}
