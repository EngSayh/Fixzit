import { NextRequest, NextResponse } from 'next/server';

const enabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';

/**
 * Server-side demo login endpoint
 * Keeps passwords on the server, performs login internally, sets cookies
 */
export async function POST(req: NextRequest) {
  if (!enabled) {
    return NextResponse.json({ error: 'Demo not enabled' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: string };
  
  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  try {
    // Load credentials server-side only
    const { DEMO_CREDENTIALS, CORPORATE_CREDENTIALS } = await import('@/dev/credentials.server');
    const all = [...DEMO_CREDENTIALS, ...CORPORATE_CREDENTIALS];
    const found = all.find(c => c.role === role);
    
    if (!found) {
      return NextResponse.json({ error: 'Unknown role' }, { status: 404 });
    }

    // Build login payload WITHOUT exposing password to client
    const loginData =
      found.loginType === 'personal'
        ? { email: (found as any).email, password: (found as any).password, loginType: 'personal' }
        : { employeeNumber: (found as any).employeeNumber, password: (found as any).password, loginType: 'corporate' };

    // Call existing auth endpoint on the server side so cookies/session are set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    const url = new URL('/api/auth/login', baseUrl);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'cookie': req.headers.get('cookie') ?? ''
      },
      body: JSON.stringify(loginData),
      redirect: 'manual',
    });

    // Forward Set-Cookie headers so the browser session is established
    const data = await safeJson(resp);
    const res = NextResponse.json(data, { status: resp.status });
    
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
