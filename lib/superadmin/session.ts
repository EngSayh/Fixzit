import { SignJWT, jwtVerify } from 'jose';

export type SuperadminToken = {
  username: string;
  role: string;
  ip?: string;
};

const SECRET = process.env.SUPERADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'change-me-secret';
const TTL_SECONDS = 12 * 60 * 60; // 12 hours

export const SUPERADMIN_COOKIE = '__Host-fixzit_superadmin';

function getSecret() {
  return new TextEncoder().encode(SECRET);
}

export async function signSuperadminToken(payload: SuperadminToken): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(getSecret());
}

export async function verifySuperadminToken(token: string): Promise<SuperadminToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SuperadminToken;
  } catch {
    return null;
  }
}

export function buildAuthCookie(token: string): string {
  const maxAge = TTL_SECONDS;
  return `${SUPERADMIN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): string {
  return `${SUPERADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
