/**
 * @fileoverview Organization Search API (Support Tool)
 * @description Enables Super Admins to search for organizations by various
 * identifiers for support and troubleshooting purposes.
 * 
 * @module api/support/organizations/search
 * @requires SUPER_ADMIN role
 * 
 * @endpoints
 * - GET /api/support/organizations/search?identifier=<query> - Search organizations
 * 
 * @queryParams
 * - identifier: Search term (orgId, code, name, or registration number)
 * - corporateId: Alias for identifier
 * 
 * @response
 * - Array of matching organizations with:
 *   - orgId: Organization ID
 *   - name: Organization name
 *   - code: Organization code
 *   - registrationNumber: Legal registration number
 *   - subscriptionPlan: Current subscription plan
 * 
 * @security
 * - SUPER_ADMIN only - cross-tenant access for support
 * - Regex patterns escaped to prevent ReDoS
 * - Identifier length limited to 256 characters
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Organization } from "@/server/models/Organization";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

function sanitize(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MIN_IDENTIFIER_LEN = 3; // Prevent broad scans for 1-2 char inputs
const MAX_IDENTIFIER_LEN = 256;

const searchParamsSchema = z.object({
  identifier: z.string().min(MIN_IDENTIFIER_LEN).max(MAX_IDENTIFIER_LEN).optional(),
  corporateId: z.string().min(MIN_IDENTIFIER_LEN).max(MAX_IDENTIFIER_LEN).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).refine(data => data.identifier || data.corporateId, {
  message: "Either identifier or corporateId is required",
});

const serialize = (org: {
  orgId: string;
  name: string;
  code?: string;
  legal?: { registrationNumber?: string };
  subscription?: { plan?: string };
}) => ({
  orgId: org.orgId,
  name: org.name,
  code: org.code ?? null,
  registrationNumber: org.legal?.registrationNumber ?? null,
  subscriptionPlan: org.subscription?.plan ?? null,
});

export async function GET(req: NextRequest) {
  const rateLimitRes = enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "support:org:search" });
  if (rateLimitRes) return rateLimitRes;
  
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  
  // Validate input with Zod
  const parseResult = searchParamsSchema.safeParse({
    identifier: searchParams.get("identifier") ?? undefined,
    corporateId: searchParams.get("corporateId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { identifier: rawId, corporateId, limit } = parseResult.data;
  const identifier = (rawId || corporateId || "").trim();

  if (!identifier) {
    return NextResponse.json(
      { error: "identifier query param is required" },
      { status: 400 },
    );
  }

  // Length already validated by Zod, but keep for defense-in-depth
  if (identifier.length > MAX_IDENTIFIER_LEN) {
    return NextResponse.json({ error: "identifier too long" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    // Strategy: exact matches first, then prefix matches, then fuzzy contains
    // Weight: orgId/registrationNumber (exact) > code/name (prefix) > name (fuzzy)
    
    const sanitizedId = sanitize(identifier);
    const prefixRegex = new RegExp(`^${sanitizedId}`, "i");
    const fuzzyRegex = new RegExp(sanitizedId, "i");

    // Weighted search: exact orgId/registrationNumber (score=100) > prefix code/name (score=50) > fuzzy name (score=10)
    const pipeline: any[] = [
      {
        $addFields: {
          searchScore: {
            $sum: [
              // Exact match on orgId (highest priority)
              { $cond: [{ $eq: ["$orgId", identifier] }, 100, 0] },
              // Exact match on registrationNumber
              { $cond: [{ $eq: ["$legal.registrationNumber", identifier] }, 100, 0] },
              // Prefix match on code
              { $cond: [{ $regexMatch: { input: "$code", regex: prefixRegex } }, 50, 0] },
              // Prefix match on name
              { $cond: [{ $regexMatch: { input: "$name", regex: prefixRegex } }, 50, 0] },
              // Fuzzy match on name (fallback)
              { $cond: [{ $regexMatch: { input: "$name", regex: fuzzyRegex } }, 10, 0] },
            ],
          },
        },
      },
      {
        $match: {
          searchScore: { $gt: 0 },
        },
      },
      {
        $sort: { searchScore: -1, name: 1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          orgId: 1,
          name: 1,
          code: 1,
          "legal.registrationNumber": 1,
          "subscription.plan": 1,
          searchScore: 1,
        },
      },
    ];

    const results = await Organization.aggregate(pipeline);

    return NextResponse.json(
      results.map(org => ({
        orgId: org.orgId,
        name: org.name,
        code: org.code ?? null,
        registrationNumber: org.legal?.registrationNumber ?? null,
        subscriptionPlan: org.subscription?.plan ?? null,
        _score: org.searchScore, // Include score for debugging
      })),
    );
  } catch (error) {
    logger.error("Support org search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
            { orgId: identifier }, // Exact orgId
            { "legal.registrationNumber": identifier }, // Exact registration
            { code: prefixRegex }, // Code starts with
            { name: prefixRegex }, // Name starts with
            { name: fuzzyRegex }, // Name contains (fallback)
          ],
        },
      },
      {
        $addFields: {
          // Relevance score: higher = better match
          relevanceScore: {
            $cond: [
              { $eq: ["$orgId", identifier] },
              100, // Exact orgId = highest
              {
                $cond: [
                  { $eq: ["$legal.registrationNumber", identifier] },
                  90, // Exact registration = very high
                  {
                    $cond: [
                      { $regexMatch: { input: "$code", regex: `^${sanitizedId}`, options: "i" } },
                      70, // Code prefix = high
                      {
                        $cond: [
                          { $regexMatch: { input: "$name", regex: `^${sanitizedId}`, options: "i" } },
                          60, // Name prefix = medium-high
                          40, // Name contains = medium (fallback)
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { relevanceScore: -1 as const, name: 1 as const } }, // Best matches first, then alphabetical
      { $limit: limit },
      {
        $project: {
          orgId: 1,
          name: 1,
          code: 1,
          "legal.registrationNumber": 1,
          "subscription.plan": 1,
          relevanceScore: 1, // Include for debugging (optional in production)
        },
      },
    ];

    const records = await Organization.aggregate(pipeline, { maxTimeMS: 10_000 });

    const response = NextResponse.json({ results: records.map(serialize) });
    // Private cache for support tools - no public caching
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    logger.error("Failed to search organizations", { error, identifier });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
