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
  let headerList: ReturnType<typeof headers> | undefined;
  try {
    headerList = headers();
  } catch (_) {
    headerList = undefined;
  }
  if (!headerList) {
    return undefined;
  }
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
  let authCookieValue: string | undefined;
  try {
    const cookieStore = cookies();
    authCookieValue = cookieStore.get('fixzit_auth')?.value;
  } catch (_) {
    authCookieValue = undefined;
  }
  const headersInit = new Headers(init?.headers ?? {});

  if (authCookieValue && !headersInit.has('Cookie')) {
    headersInit.set('Cookie', `fixzit_auth=${authCookieValue}`);
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
