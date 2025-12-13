/**
 * @fileoverview Souq Products API (Re-export)
 * @description Re-exports the catalog products API for backward compatibility at the /api/souq/products endpoint.
 * @route GET /api/souq/products - List products
 * @route POST /api/souq/products - Create product
 * @access Authenticated
 * @module souq
 */

import { wrapRoute } from "@/lib/api/route-wrapper";
import {
  GET as catalogGet,
  POST as catalogPost,
} from "@/app/api/souq/catalog/products/route";

export const GET = wrapRoute(catalogGet, "api.souq.products.get.catch");
export const POST = wrapRoute(catalogPost, "api.souq.products.post.catch");
