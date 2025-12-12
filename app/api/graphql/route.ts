/**
 * GraphQL API Route Handler
 *
 * Exposes the GraphQL API at /api/graphql with rate limiting and
 * defensive error handling to prevent abuse of the playground or API.
 */
import { NextRequest } from "next/server";
import { createGraphQLHandler } from "@/lib/graphql";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { wrapRoute } from "@/lib/api/route-wrapper";

// Create the GraphQL handler
const { handleRequest } = createGraphQLHandler();

const GRAPHQL_RL_LIMIT = 60;
const GRAPHQL_RL_WINDOW = 60_000;

async function handleWithRateLimit(request: NextRequest) {
  const key = buildOrgAwareRateLimitKey(request, null, null);
  const rl = await smartRateLimit(
    `${key}:graphql`,
    GRAPHQL_RL_LIMIT,
    GRAPHQL_RL_WINDOW,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  return handleRequest(request as NextRequest);
}

// Export handlers for Next.js App Router
export const GET = wrapRoute(handleWithRateLimit, "api.graphql.get.catch");
export const POST = wrapRoute(handleWithRateLimit, "api.graphql.post.catch");
