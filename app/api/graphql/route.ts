/**
 * GraphQL API Route Handler
 *
 * This route exposes the GraphQL API at /api/graphql
 * Supports both GET (for GraphiQL playground) and POST (for queries/mutations)
 *
 * @module app/api/graphql/route
 *
 * To enable:
 * 1. Install: pnpm add graphql graphql-yoga
 * 2. Set FEATURE_INTEGRATIONS_GRAPHQL_API=true in environment
 */

import { createGraphQLHandler } from "@/lib/graphql";

// Create the GraphQL handler
const { handleRequest } = createGraphQLHandler();

// Export handlers for Next.js App Router
export { handleRequest as GET, handleRequest as POST };
