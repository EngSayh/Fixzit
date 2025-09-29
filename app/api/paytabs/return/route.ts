import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cartId = url.searchParams.get('cart_id') || url.searchParams.get('cartId');
  const status = url.searchParams.get('respStatus') || url.searchParams.get('status');

  const base = process.env.APP_URL || `${url.protocol}//${url.host}`;
  const redirectUrl = new URL('/billing/complete', base);
  if (cartId) redirectUrl.searchParams.set('cart_id', cartId);
  if (status) redirectUrl.searchParams.set('status', status);

  return NextResponse.redirect(redirectUrl.toString());
}
