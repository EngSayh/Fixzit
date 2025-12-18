/**
 * @fileoverview Superadmin Organization Search API
 * @description GET endpoint for searching organizations by name
 * @route GET /api/superadmin/organizations/search?q=query
 * @access Superadmin only
 * @module api/superadmin/organizations/search
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getRedisClient } from "@/lib/redis";

// Organization model stub (assumes Organization collection exists)
// Adjust schema based on actual Organization model
const OrganizationSchema = new mongoose.Schema({
  _id: String,
  name: String,
  slug: String,
  status: String,
  createdAt: Date,
});

const Organization = mongoose.models.Organization || mongoose.model("Organization", OrganizationSchema);

// Cache TTL: 5 minutes
const CACHE_TTL_SECONDS = 300;

/**
 * Generate cache key for organization search
 */
function getCacheKey(query: string): string {
  // Normalize query to lowercase for consistent caching
  return `superadmin:org-search:query:${query.toLowerCase().trim()}`;
}

/**
 * GET /api/superadmin/organizations/search
 * Search organizations by name (case-insensitive, partial match)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    // Rate limiting: 20 requests per minute per superadmin
    const rateLimitResponse = enforceRateLimit(request, {
      keyPrefix: `superadmin:org-search:${session.username}`,
      requests: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    await connectDb();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required (use ?q=...)" },
        { status: 400 }
      );
    }

    // Try to get from cache first (Redis)
    const cacheKey = getCacheKey(query);
    const redisClient = getRedisClient();
    
    if (redisClient) {
      try {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          logger.info("Superadmin organization search (cache hit)", {
            username: session.username,
            query,
          });
          
          return NextResponse.json(JSON.parse(cachedResult));
        }
      } catch (cacheError) {
        // Cache read error - log but continue with DB query
        logger.warn("Failed to read from cache, continuing with DB query", {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }
    }

    await connectDb();

    // Search organizations by name (case-insensitive)
    const organizations = await Organization.find(
      {
        name: { $regex: query, $options: "i" },
        status: { $ne: "deleted" }, // Exclude deleted orgs
      },
      { _id: 1, name: 1, slug: 1 }
    )
      .limit(20)
      .lean();

    logger.info("Superadmin organization search (cache miss)", {
      username: session.username,
      query,
      resultsCount: organizations.length,
    });

    const response = {
      success: true,
      organizations: organizations.map((org: any) => ({
        id: org._id,
        name: org.name,
        slug: org.slug || null,
      })),
    };

    // Cache the result if Redis is available
    if (redisClient) {
      try {
        await redisClient.setex(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify(response)
        );
        logger.debug("Cached organization search results", {
          cacheKey,
          ttl: CACHE_TTL_SECONDS,
        });
      } catch (cacheError) {
        // Cache write error - log but don't fail the request
        logger.warn("Failed to write to cache", {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to search organizations", { error });
    return NextResponse.json(
      { error: "Failed to search organizations" },
      { status: 500 }
    );
  }
}
