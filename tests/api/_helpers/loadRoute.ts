/**
 * @fileoverview Standardized route loading for API tests
 * Ensures consistent dynamic import pattern across all test files
 */

type RouteModule = {
  GET?: (req: Request, context?: unknown) => Promise<Response>;
  POST?: (req: Request, context?: unknown) => Promise<Response>;
  PUT?: (req: Request, context?: unknown) => Promise<Response>;
  PATCH?: (req: Request, context?: unknown) => Promise<Response>;
  DELETE?: (req: Request, context?: unknown) => Promise<Response>;
};

type LoadRouteResult = {
  route: RouteModule | null;
  error: string | null;
  exists: boolean;
};

/**
 * Safely load an API route module
 * Returns null if route doesn't exist (for stub tests)
 * 
 * @example
 * const { route, exists } = await loadRoute('@/app/api/admin/users/route');
 * if (!exists) {
 *   it.skip('route not implemented');
 *   return;
 * }
 * const response = await route.GET!(req);
 */
export async function loadRoute(routePath: string): Promise<LoadRouteResult> {
  try {
    const module = await import(routePath);
    return {
      route: module,
      error: null,
      exists: true,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    // Only treat ERR_MODULE_NOT_FOUND as "doesn't exist"
    const isNotFound = errorMessage.includes('ERR_MODULE_NOT_FOUND') || 
                       errorMessage.includes('Cannot find module');
    return {
      route: null,
      error: errorMessage,
      exists: !isNotFound,
    };
  }
}

/**
 * Check if a route exports a specific HTTP method
 */
export function hasMethod(route: RouteModule | null, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): boolean {
  return route !== null && typeof route[method] === 'function';
}

/**
 * Skip test if route doesn't exist
 * Use this for stub/future route tests
 */
export function skipIfMissing(result: LoadRouteResult, it: typeof globalThis.it): void {
  if (!result.exists) {
    it.skip(`Route not implemented: ${result.error}`);
  }
}
