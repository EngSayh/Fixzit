import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // This endpoint is a lightweight stub for tests; in production this should
    // trigger the actual password reset flow (email or SMS).
    return NextResponse.json({ ok: true, message: 'Reset email queued', email });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
  }
}
