import { cookies } from 'next/headers';
import { verifySuperadminToken, SUPERADMIN_COOKIE, SuperadminToken } from './session';

export async function requireSuperadmin(): Promise<SuperadminToken | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifySuperadminToken(token);
}
