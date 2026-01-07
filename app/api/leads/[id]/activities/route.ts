/**
 * @fileoverview Lead Activities API
 * @description Activity timeline for leads (calls, notes, emails, etc.)
 * 
 * @module api/leads/[id]/activities
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/leads/[id]/activities - Get activity timeline
 * - POST /api/leads/[id]/activities - Log new activity
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SouqLead } from "@/server/models/souq/Lead";
import { LeadActivity } from "@/server/models/souq/LeadActivity";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";

// ============================================================================
// VALIDATION
// ============================================================================

const CreateActivitySchema = z.object({
  type: z.enum(["call", "email", "whatsapp", "sms", "meeting", "site_visit", "note", "status_change", "assignment"]),
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  description_ar: z.string().max(2000).optional(),
  outcome: z.enum(["positive", "neutral", "negative"]).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/leads/[id]/activities
 * Get activity timeline for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "leads:activities:list" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: leadId } = await params;

    await connectDB();

    // Verify lead exists and belongs to tenant (NO_LEAN - only used for existence check)
    const lead = await SouqLead.findOne({ _id: leadId, org_id: tenantId }).lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    // Get activities
    const [activities, total] = await Promise.all([
      LeadActivity.find({ org_id: tenantId, lead_id: leadId })
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("performed_by", "name email avatar")
        .lean(),
      LeadActivity.countDocuments({ org_id: tenantId, lead_id: leadId }),
    ]);

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_more: page * limit < total,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging for debugging
    console.error("[Lead Activities GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/activities
 * Log new activity for a lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "leads:activities:create" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: leadId } = await params;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify lead exists and belongs to tenant
    const lead = await SouqLead.findOne({ _id: leadId, org_id: tenantId }).lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Create activity
    const activity = await LeadActivity.create({
      org_id: tenantId,
      lead_id: leadId,
      type: parsed.data.type,
      title: parsed.data.title,
      title_ar: parsed.data.title_ar,
      description: parsed.data.description,
      description_ar: parsed.data.description_ar,
      outcome: parsed.data.outcome,
      scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at) : undefined,
      duration_minutes: parsed.data.duration_minutes,
      metadata: parsed.data.metadata,
      performed_by: userId,
    });

    // Update lead's last_activity_at
    await SouqLead.findByIdAndUpdate(leadId, {
      last_activity_at: new Date(),
    });

    return NextResponse.json(
      {
        id: activity._id,
        type: activity.type,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging for debugging
    console.error("[Lead Activities POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
