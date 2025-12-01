/**
 * Aqar Souq - Leads API
 *
 * POST /api/aqar/leads - Create inquiry lead
 * GET /api/aqar/leads - Get user's leads (owner/agent)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongo";
import { AqarLead, AqarListing } from "@/server/models/aqar";
import { LeadSource } from "@/server/models/aqar/Lead";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { incrementAnalyticsWithRetry } from "@/lib/analytics/incrementWithRetry";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  clearTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";
import mongoose from "mongoose";
import { z } from "zod";
import { Role, SubRole, normalizeRole, normalizeSubRole } from "@/domain/fm/fm-lite";

// Validation schema for lead creation
const LeadCreateSchema = z.object({
  listingId: z.string().optional(),
  projectId: z.string().optional(),
  inquirerName: z.string().trim().min(1, "Name is required").max(100),
  inquirerPhone: z
    .string()
    .trim()
    .regex(/^[\d\s\-+()]{7,20}$/, "Invalid phone number format"),
  inquirerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .max(100)
    .optional()
    .or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "DAILY"]),
  message: z.string().trim().max(1000).optional(),
  source: z.enum(
    Object.values(LeadSource) as [LeadSource, ...LeadSource[]]
  ),
});

// Pagination constants
const MAX_PAGE_LIMIT = 100;
const MAX_SKIP = 100000; // Prevent DoS via huge skip values

export const runtime = "nodejs";

// POST /api/aqar/leads
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting BEFORE DB connection to shed load early
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: "Too many lead submissions. Please try again in an hour.",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await connectDb();

    // Auth is optional for public inquiries
    let userId: string | undefined;
    try {
      const user = await getSessionUser(request);
      userId = user.id;
    } catch (authError) {
      // Distinguish between "not authenticated" (public inquiry allowed) vs actual errors
      // Expected: getSessionUser throws Error with 'Unauthorized' message when no session
      // Unexpected: Any other error (DB connection, token parsing, etc.)
      const isExpectedAuthFailure =
        authError instanceof Error &&
        (authError.message === "Unauthorized" ||
          authError.message.includes("No session found"));

      if (!isExpectedAuthFailure) {
        logger.error(
          "Unexpected auth error in leads POST",
          authError instanceof Error ? authError : new Error(String(authError)),
          { route: "POST /api/aqar/leads" },
        );
      }
      // Public inquiry - no auth required
    }

    const body = await request.json();

    // Validate request body with Zod
    const validation = LeadCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const {
      listingId,
      projectId,
      inquirerName,
      inquirerPhone,
      inquirerEmail,
      intent,
      message,
      source,
    } = validation.data;

    // Ensure either listingId or projectId is provided
    if (!listingId && !projectId) {
      return NextResponse.json(
        { error: "Either listingId or projectId is required" },
        { status: 400 },
      );
    }

    // Validate ObjectId format for listingId and projectId
    if (listingId && !mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json(
        { error: "Invalid listingId format" },
        { status: 400 },
      );
    }

    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid projectId format" },
        { status: 400 },
      );
    }

    // Get recipient (listing owner or project developer)
    let recipientId: string | undefined;
    let orgIdForLead: string | undefined;

    if (listingId) {
      const listing = await AqarListing.findById(listingId);
      if (!listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 },
        );
      }
      recipientId = String(listing.listerId);
      // Enforce tenant ownership from the listing document (authoritative)
      const listingOrg =
        (listing as { orgId?: unknown; org_id?: unknown }).orgId ??
        (listing as { orgId?: unknown; org_id?: unknown }).org_id;
      orgIdForLead =
        typeof listingOrg === "string"
          ? listingOrg
          : listingOrg
            ? String(listingOrg)
            : undefined;

      // Validate recipientId is a valid ObjectId
      if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
        return NextResponse.json(
          { error: "Listing has no owner" },
          { status: 400 },
        );
      }

      // Increment inquiries count with tenant context (async, non-blocking with retry logic)
      // Set tenant context for analytics to ensure org_id scoping
      if (orgIdForLead) {
        (async () => {
          try {
            setTenantContext({ orgId: String(orgIdForLead), userId });
            await incrementAnalyticsWithRetry({
              model: AqarListing,
              id: new mongoose.Types.ObjectId(listingId),
              updateOp: {
                $inc: { "analytics.inquiries": 1 },
                $set: { "analytics.lastInquiryAt": new Date() },
              },
              entityType: "listing",
            });
          } catch (error) {
            // Structured warning for observability - allows alerting on analytics drift
            logger.warn(
              "[Analytics] Listing inquiry increment failed after retries",
              {
                listingId,
                orgId: orgIdForLead,
                metric: "analytics.listing.inquiry.increment.failed",
                error: error instanceof Error ? error.message : String(error),
              },
            );
          } finally {
            clearTenantContext();
          }
        })();
      }
    } else if (projectId) {
      const { AqarProject } = await import("@/server/models/aqar");
      const project = await AqarProject.findById(projectId);
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }
      recipientId = String(project.developerId);
      const projectOrg =
        (project as { orgId?: unknown; org_id?: unknown }).orgId ??
        (project as { orgId?: unknown; org_id?: unknown }).org_id;
      orgIdForLead =
        typeof projectOrg === "string"
          ? projectOrg
          : projectOrg
            ? String(projectOrg)
            : undefined;

      // Validate recipientId is a valid ObjectId
      if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
        return NextResponse.json(
          { error: "Project has no developer" },
          { status: 400 },
        );
      }

      // Increment inquiries count with tenant context (async, non-blocking with retry logic)
      // Set tenant context for analytics to ensure org_id scoping
      if (orgIdForLead) {
        (async () => {
          try {
            setTenantContext({ orgId: String(orgIdForLead), userId });
            await incrementAnalyticsWithRetry({
              model: AqarProject,
              id: new mongoose.Types.ObjectId(projectId),
              updateOp: {
                $inc: { inquiries: 1 },
                $set: { lastInquiryAt: new Date() },
              },
              entityType: "project",
            });
          } catch (error) {
            // Structured warning for observability - allows alerting on analytics drift
            logger.warn(
              "[Analytics] Project inquiry increment failed after retries",
              {
                projectId,
                orgId: orgIdForLead,
                metric: "analytics.project.inquiry.increment.failed",
                error: error instanceof Error ? error.message : String(error),
              },
            );
          } finally {
            clearTenantContext();
          }
        })();
      }
    }

    // Require tenant attribution from listing/project
    if (!orgIdForLead) {
      return NextResponse.json(
        { error: "Unable to determine tenant for lead" },
        { status: 400 },
      );
    }

    // Safety net to satisfy TypeScript definite assignment analysis
    if (!recipientId) {
      return NextResponse.json(
        { error: "Unable to determine lead recipient" },
        { status: 400 },
      );
    }

    setTenantContext({ orgId: String(orgIdForLead), userId });

    const lead = new AqarLead({
      // Source-of-truth org comes from listing/project
      orgId: orgIdForLead,
      listingId,
      projectId,
      source,
      inquirerId: userId,
      inquirerName,
      inquirerPhone,
      inquirerEmail: inquirerEmail || undefined,
      recipientId,
      intent,
      message: message || undefined,
    });

    await lead.save();

    // NOTE: clearTenantContext() is called in the finally block to ensure cleanup
    // even on error paths, avoiding the need for a success-path call here

    // FUTURE: Send notification to recipient (email/SMS/push).
    // Implementation: Use lib/fm-notifications.ts sendNotification() or SendGrid for emails.

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    logger.error(
      "Error creating lead:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  } finally {
    // Ensure tenant context is always cleared, even on error
    clearTenantContext();
  }
}

// STRICT v4.1: Roles allowed to access CRM lead data (PII-bearing)
// Uses canonical Role/SubRole enums to prevent RBAC drift
const LEADS_READ_ALLOWED_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.CORPORATE_OWNER,
  Role.PROPERTY_MANAGER,
]);

// SubRoles that grant CRM lead access (combined with TEAM_MEMBER base role)
const LEADS_READ_ALLOWED_SUBROLES = new Set<SubRole>([
  SubRole.SUPPORT_AGENT,
  SubRole.OPERATIONS_MANAGER,
]);

/**
 * Check if user has permission to access CRM leads.
 * Uses canonical Role/SubRole normalization to handle legacy role aliases.
 */
function canAccessLeads(userRole?: string | null, userSubRole?: string | null): boolean {
  const normalizedRole = normalizeRole(userRole);
  if (!normalizedRole) return false;
  
  // Direct role match (admin, owner, property manager)
  if (LEADS_READ_ALLOWED_ROLES.has(normalizedRole)) {
    return true;
  }
  
  // Team member with appropriate sub-role
  if (normalizedRole === Role.TEAM_MEMBER) {
    const normalizedSubRole = normalizeSubRole(userSubRole);
    if (normalizedSubRole && LEADS_READ_ALLOWED_SUBROLES.has(normalizedSubRole)) {
      return true;
    }
  }
  
  return false;
}

// GET /api/aqar/leads
export async function GET(request: NextRequest) {
  try {
    // Handle authentication first to avoid wasting DB resources on unauthenticated requests
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error(
        "Authentication failed:",
        authError instanceof Error ? authError.message : "Unknown error",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT v4.1: RBAC gate for CRM lead access (PII protection)
    // Uses canonical Role/SubRole normalization to handle all role aliases
    if (!canAccessLeads(user.role, user.subRole)) {
      logger.warn("Leads access denied - insufficient role", {
        userId: user.id,
        role: user.role,
        subRole: user.subRole,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only connect to database after authentication succeeds
    await connectDb();
    if (user.orgId) {
      setTenantContext({ orgId: user.orgId, userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Parse and validate pagination parameters
    const rawPage = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : 1;
    const rawLimit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 20;

    // Clamp pagination values to prevent DoS attacks
    const page = Math.max(1, Math.min(rawPage, 10000)); // Max page 10000
    const limit = Math.max(1, Math.min(rawLimit, MAX_PAGE_LIMIT)); // Max 100 items per page
    const skip = Math.min((page - 1) * limit, MAX_SKIP); // Prevent huge skip values

    const query: Record<string, unknown> = {
      recipientId: user.id,
    };

    if (user.orgId) {
      query.orgId = user.orgId;
    }

    if (status) {
      query.status = status;
    }

    const [leads, total] = await Promise.all([
      AqarLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listingId")
        .populate("projectId")
        .lean(),
      AqarLead.countDocuments(query),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching leads:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  } finally {
    clearTenantContext();
  }
}
