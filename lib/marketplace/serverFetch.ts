import { createCorrelationContext, logWithCorrelation } from './correlation';
import { getMarketplaceErrorMessage, type Lang } from '@/lib/i18n';

/**
 * Custom error class for marketplace fetch operations with i18n support
 */
export class MarketplaceFetchError extends Error {
  public readonly status: number;
  public readonly correlationId: string;
  public readonly localizedMessage: string;
  
  constructor(
    message: string, 
    status: number, 
    correlationId: string,
    errorType: string,
    lang: Lang = 'en'
  ) {
    super(message);
    this.name = 'MarketplaceFetchError';
    this.status = status;
    this.correlationId = correlationId;
    this.localizedMessage = getMarketplaceErrorMessage(errorType, lang, message);
  }
}

/**
 * Server-side fetch utility for marketplace APIs with tenant isolation
 */
export async function marketplaceServerFetch(
  url: string, 
  options: RequestInit & { 
    tenantId?: string;
    lang?: Lang;
  } = {}
): Promise<Response> {
  const { tenantId, lang = 'en', ...fetchOptions } = options;
  const correlationId = createCorrelationContext();
  
  try {
    logWithCorrelation('marketplace-fetch', 'Initiating marketplace request', {
      url,
      method: fetchOptions.method || 'GET',
      tenantId
    });

    // Prepare headers with tenant context
    const headers = new Headers(fetchOptions.headers);
    headers.set('X-Correlation-ID', correlationId);
    headers.set('Content-Type', 'application/json');
    
    if (tenantId) {
      headers.set('X-Tenant-ID', tenantId);
    }

    // Add language preference
    headers.set('Accept-Language', lang);

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorType = getErrorType(response.status);
      
      logWithCorrelation('marketplace-fetch', 'Marketplace request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorType
      });

      throw new MarketplaceFetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        correlationId,
        errorType,
        lang
      );
    }

    logWithCorrelation('marketplace-fetch', 'Marketplace request successful', {
      url,
      status: response.status
    });

    return response;

  } catch (error) {
    if (error instanceof MarketplaceFetchError) {
      throw error;
    }

    logWithCorrelation('marketplace-fetch', 'Marketplace request error', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new MarketplaceFetchError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0, // Network error
      correlationId,
      'network',
      lang
    );
  }
}

/**
 * Map HTTP status codes to error types for i18n
 */
function getErrorType(status: number): string {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 408:
      return 'timeout';
    case 422:
      return 'validation';
    case 500:
      return 'server';
    case 503:
      return 'database';
    default:
      return 'network';
  }
}

/**
 * Helper to extract tenant ID from cookies or headers
 */
export function extractTenantId(request: Request): string | undefined {
  // Try header first
  const headerTenant = request.headers.get('X-Tenant-ID');
  if (headerTenant) return headerTenant;

  // Try cookie
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  const tenantCookie = cookieHeader
    .split(';')
    .find(cookie => cookie.trim().startsWith('tenant='));
    
  return tenantCookie?.split('=')[1]?.trim();
}

/**
 * Helper to extract language preference
 */
export function extractLanguage(request: Request): Lang {
  const acceptLang = request.headers.get('Accept-Language');
  if (acceptLang?.includes('ar')) return 'ar';
  return 'en';
}