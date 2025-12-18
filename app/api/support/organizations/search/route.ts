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

    const regex = new RegExp(sanitize(identifier), "i");
    const records = await Organization.find({
      $or: [
        { orgId: identifier },
        { code: regex },
        { name: regex },
        { "legal.registrationNumber": identifier },
      ],
    })
      .select("orgId name code legal.registrationNumber subscription.plan")
      .limit(limit)
      .lean();

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
