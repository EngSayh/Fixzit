/**
 * @fileoverview Legacy Healthcheck Alias
 * @description Re-exports the main health check endpoint for backward compatibility with older monitoring configurations.
 * @route GET /api/healthcheck - Alias for /api/health
 * @access Public
 * @module health
 */

export { dynamic } from "../health/route";
export { GET } from "../health/route";
