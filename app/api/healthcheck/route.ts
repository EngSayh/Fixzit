/**
 * @fileoverview Legacy Healthcheck Alias
 * @description Re-exports the main health check endpoint for backward compatibility with older monitoring configurations.
 * @route GET /api/healthcheck - Alias for /api/health
 * @access Public
 * @module health
 */

import { wrapRoute } from "@/lib/api/route-wrapper";
import { GET as healthGet } from "../health/route";

// Define directly instead of re-exporting to satisfy Next.js static analysis
export const dynamic = "force-dynamic";
export const GET = wrapRoute(healthGet, "api.healthcheck.get.catch");
