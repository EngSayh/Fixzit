import { cookies, headers } from 'next/headers';
import { randomUUID } from 'node:crypto';

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
  } catch (error) {
    const correlationId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.debug('[MarketplaceFetch] headers() unavailable', { correlationId, message });
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
  let errorCorrelationId: string | undefined;
  try {
    const cookieStore = cookies();
    authCookieValue = cookieStore.get('fixzit_auth')?.value;
  } catch (error) {
    errorCorrelationId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.debug('[MarketplaceFetch] cookies() unavailable', { correlationId: errorCorrelationId, message });
    authCookieValue = undefined;
  }
  const headersInit = new Headers(init?.headers ?? {});

  if (authCookieValue) {
    const existing = headersInit.get('Cookie');
    const parsedCookies = existing
      ? existing
          .split(';')
          .map((cookie) => cookie.trim())
          .filter(Boolean)
          .filter((cookie) => !cookie.toLowerCase().startsWith('fixzit_auth='))
      : [];
    parsedCookies.push(`fixzit_auth=${authCookieValue}`);
    headersInit.set('Cookie', parsedCookies.join('; '));
  }

  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: headersInit
  });

  if (!response.ok) {
    const correlationId = errorCorrelationId ?? randomUUID();
    const errorPayload = {
      name: 'MarketplaceFetchError',
      code: 'HTTP_ERROR',
      userMessage: 'Unable to reach marketplace services. Please try again shortly.',
      devMessage: `Request failed: ${response.status} ${response.statusText} for ${url}`,
      correlationId,
    };
    // eslint-disable-next-line no-console
    console.error('[MarketplaceFetch] request failed', errorPayload);
    throw new Error(JSON.stringify(errorPayload));
  }

  return response;
}

export async function serverFetchJsonWithTenant<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await serverFetchWithTenant(path, init);
  return response.json() as Promise<T>;
}
