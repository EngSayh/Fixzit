/**
 * Superadmin Cookie Check Endpoint
 * Simple endpoint to verify if the cookie is being sent by the browser
 * 
 * @module app/api/superadmin/check-cookie/route
 */

import { NextRequest, NextResponse } from "next/server";
import { SUPERADMIN_COOKIE_NAME, decodeSuperadminToken } from "@/lib/superadmin/auth.edge";

export const runtime = "edge"; // Force Edge Runtime to match middleware

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const superadminCookie = request.cookies.get(SUPERADMIN_COOKIE_NAME);
  
  // Try to decode the token to verify it works in Edge runtime
  let sessionValid = false;
  let sessionError: string | null = null;
  let sessionData: { username?: string; role?: string; orgId?: string } | null = null;
  
  if (superadminCookie?.value) {
    try {
      const session = await decodeSuperadminToken(superadminCookie.value);
      sessionValid = !!session;
      if (session) {
        sessionData = {
          username: session.username,
          role: session.role,
          orgId: session.orgId ? `${session.orgId.slice(0, 4)}...` : undefined,
        };
      }
    } catch (error) {
      sessionError = error instanceof Error ? error.message : String(error);
    }
  }
  
  // Secret fingerprint: redacted by default for security
  // Enable with ENABLE_SECRET_FINGERPRINT=true + HMAC_KEY for debugging
  let secretFingerprint = 'redacted';
  
  if (process.env.ENABLE_SECRET_FINGERPRINT === 'true') {
    const secret = process.env.SUPERADMIN_JWT_SECRET || 
                   process.env.NEXTAUTH_SECRET || 
                   process.env.AUTH_SECRET || '';
    const hmacKey = process.env.HMAC_KEY;
    
    if (!secret) {
      secretFingerprint = 'none';
    } else if (!hmacKey) {
      secretFingerprint = 'hmac_key_missing';
    } else {
      // HMAC-SHA256 fingerprint using Web Crypto API (Edge-safe)
      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(hmacKey);
        const secretData = encoder.encode(secret);
        const cryptoKey = await crypto.subtle.importKey(
          'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, secretData);
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        secretFingerprint = hashHex.slice(0, 8); // First 8 hex chars only
      } catch {
        secretFingerprint = 'hmac_error';
      }
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    runtime: "edge",
    cookies: {
      total: allCookies.length,
      names: allCookies.map(c => c.name),
      hasSuperadminCookie: !!superadminCookie,
      superadminCookieLength: superadminCookie?.value?.length || 0,
      // Show first/last 10 chars of token for debugging (safe)
      superadminCookiePreview: superadminCookie?.value 
        ? `${superadminCookie.value.slice(0, 10)}...${superadminCookie.value.slice(-10)}`
        : null,
    },
    session: {
      valid: sessionValid,
      error: sessionError,
      data: sessionData,
    },
    secrets: {
      fingerprint: secretFingerprint,
    },
    headers: {
      cookie: request.headers.get("cookie")?.slice(0, 100) || null,
    },
  }, {
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
