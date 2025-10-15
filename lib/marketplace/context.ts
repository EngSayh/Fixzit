/**
 * Marketplace context resolution utilities
 * Resolves organization and tenant information for marketplace operations
 */

export interface MarketplaceContext {
  orgId: string;
  tenantKey: string;
}

/**
 * Request-scoped context for extracting org/tenant information
 */
export interface RequestContext {
  headers?: Headers | Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  session?: {
    orgId?: string;
    tenantKey?: string;
  };
  authToken?: string;
}

/**
 * Resolves the marketplace context for the current request
 * Extracts organization and tenant from request-scoped sources with priority:
 * 1. Explicit headers (x-org-id, x-tenant-key)
 * 2. Session store or cookies (orgId, tenantKey)
 * 3. JWT claims (decoded from authToken)
 * 4. Error if no valid context found
 * 
 * @param req - Request context containing headers, session, cookies, or auth token
 * @returns Promise resolving to marketplace context with orgId and tenantKey
 * @throws Error if no valid context can be extracted
 */
export async function resolveMarketplaceContext(
  req?: RequestContext
): Promise<MarketplaceContext> {
  if (!req) {
    console.error('[MarketplaceContext] No request context provided');
    throw new Error('Request context is required for multi-tenant routing');
  }

  let orgId: string | null = null;
  let tenantKey: string | null = null;

  // Priority 1: Check explicit headers
  if (req.headers) {
    const headers = req.headers instanceof Headers ? req.headers : req.headers;
    const getHeader = (key: string): string | null => {
      if (headers instanceof Headers) {
        return headers.get(key);
      }
      const value = headers[key];
      return typeof value === 'string' ? value : null;
    };

    orgId = getHeader('x-org-id');
    tenantKey = getHeader('x-tenant-key');

    if (orgId && tenantKey) {
      console.log('[MarketplaceContext] Resolved from headers:', { orgId, tenantKey });
      return validateAndReturn({ orgId, tenantKey });
    }
  }

  // Priority 2: Check session or cookies
  if (req.session?.orgId && req.session?.tenantKey) {
    orgId = req.session.orgId;
    tenantKey = req.session.tenantKey;
    console.log('[MarketplaceContext] Resolved from session:', { orgId, tenantKey });
    return validateAndReturn({ orgId, tenantKey });
  }

  if (req.cookies?.orgId && req.cookies?.tenantKey) {
    orgId = req.cookies.orgId;
    tenantKey = req.cookies.tenantKey;
    console.log('[MarketplaceContext] Resolved from cookies:', { orgId, tenantKey });
    return validateAndReturn({ orgId, tenantKey });
  }

  // Priority 3: Decode JWT claims if authToken provided
  if (req.authToken) {
    try {
      const claims = decodeJWT(req.authToken);
      if (claims.orgId && claims.tenantKey) {
        orgId = claims.orgId;
        tenantKey = claims.tenantKey;
        console.log('[MarketplaceContext] Resolved from JWT:', { orgId, tenantKey });
        return validateAndReturn({ orgId, tenantKey });
      }
    } catch (error) {
      console.error('[MarketplaceContext] JWT decode failed:', error);
    }
  }

  // Priority 4: No valid context found - throw error
  console.error('[MarketplaceContext] Failed to resolve context from any source');
  throw new Error(
    'Unable to resolve marketplace context. Please provide org/tenant via headers (x-org-id, x-tenant-key), session, or JWT token.'
  );
}

/**
 * Validates and returns marketplace context
 * @param context - Context to validate
 * @returns Validated context
 * @throws Error if validation fails
 */
function validateAndReturn(context: MarketplaceContext): MarketplaceContext {
  const { orgId, tenantKey } = context;

  if (!orgId || typeof orgId !== 'string' || orgId.trim().length === 0) {
    throw new Error('Invalid orgId: must be a non-empty string');
  }

  if (!tenantKey || typeof tenantKey !== 'string' || tenantKey.trim().length === 0) {
    throw new Error('Invalid tenantKey: must be a non-empty string');
  }

  // Additional validation: check for suspicious values
  if (orgId === 'undefined' || orgId === 'null' || orgId === 'default-org') {
    console.warn('[MarketplaceContext] Suspicious orgId detected:', orgId);
  }

  if (tenantKey === 'undefined' || tenantKey === 'null' || tenantKey === 'default-tenant') {
    console.warn('[MarketplaceContext] Suspicious tenantKey detected:', tenantKey);
  }

  return { orgId: orgId.trim(), tenantKey: tenantKey.trim() };
}

/**
 * Decodes JWT token and extracts claims
 * @param token - JWT token string
 * @returns Decoded claims
 */
function decodeJWT(token: string): Record<string, string> {
  try {
    // Simple JWT decode (doesn't verify signature - for context extraction only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));

    return {
      orgId: decoded.orgId || decoded.org_id || decoded.organizationId,
      tenantKey: decoded.tenantKey || decoded.tenant_key || decoded.tenant
    };
  } catch (error) {
    console.error('[MarketplaceContext] JWT decode error:', error);
    throw new Error('Failed to decode JWT token');
  }
}
