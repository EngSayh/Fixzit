import { cookies, headers } from 'next/headers';

function getEnvBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (!envUrl) {
    return undefined;
  }

  return envUrl.replace(/\/$/, '');
}

function getHeaderBaseUrl() {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (!host) {
    return undefined;
  }

  const protocolHeader = headerList.get('x-forwarded-proto');
  const protocol = protocolHeader ?? (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

export function getMarketplaceBaseUrl() {
  return getEnvBaseUrl() ?? getHeaderBaseUrl() ?? 'http://localhost:3000';
}

export async function serverFetchWithTenant(path: string, init?: RequestInit) {
  const baseUrl = getMarketplaceBaseUrl();
  const url = new URL(path, baseUrl).toString();
  const cookieStore = cookies();
  const authCookie = cookieStore.get('fixzit_auth');
  const headersInit = new Headers(init?.headers ?? {});

  if (authCookie && !headersInit.has('Cookie')) {
    headersInit.set('Cookie', `fixzit_auth=${authCookie.value}`);
  }

  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: headersInit
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response;
}

export async function serverFetchJsonWithTenant<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await serverFetchWithTenant(path, init);
  return response.json() as Promise<T>;
}
