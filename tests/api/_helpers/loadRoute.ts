/**
 * @fileoverview Standardized route loading for API tests
 * Ensures consistent dynamic import pattern across all test files
 */

import type { it as vitestIt } from 'vitest';

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
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const routeModule = await import(routePath);
    return {
      route: routeModule,
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
export function skipIfMissing(result: LoadRouteResult, testFn: typeof vitestIt): void {
  if (!result.exists) {
    testFn.skip(`Route not implemented: ${result.error}`);
  }
}
