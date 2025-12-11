/**
 * @fileoverview Souq Products API (Re-export)
 * @description Re-exports the catalog products API for backward compatibility at the /api/souq/products endpoint.
 * @route GET /api/souq/products - List products
 * @route POST /api/souq/products - Create product
 * @access Authenticated
 * @module souq
 */

export { GET, POST } from "@/app/api/souq/catalog/products/route";
