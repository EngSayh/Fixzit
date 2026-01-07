/**
 * @fileoverview Leads API Routes
 * @description Property lead management for CRM functionality.
 * 
 * @module api/leads
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/leads - List leads with filters
 * - POST /api/leads - Create new lead
 * - PATCH /api/leads - Update lead status/assignment
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SouqLead } from "@/server/models/souq/Lead";
import { LeadActivity } from "@/server/models/souq/LeadActivity";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

// ============================================================================
// VALIDATION
// ============================================================================

const CreateLeadSchema = z.object({
  listing_id: z.string().min(1),
  property_type: z.enum(["apartment", "villa", "land", "commercial", "office", "warehouse"]),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^05\d{8}$/, "Phone must be Saudi format: 05xxxxxxxx"),
  email: z.string().email().optional(),
  message: z.string().max(1000).optional(),
  source: z.enum(["website", "mobile_app", "whatsapp", "phone", "walk_in", "referral", "social"]).default("website"),
  preferred_contact_method: z.enum(["phone", "whatsapp", "email"]).default("phone"),
  preferred_contact_time: z.string().optional(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
});

const UpdateLeadSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "contacted", "qualified", "negotiating", "site_visit", "offer_made", "closed_won", "closed_lost"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().optional(),
  notes: z.string().max(2000).optional(),
  next_follow_up: z.string().datetime().optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/leads
 * List leads with filters and pagination
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "leads:list" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    // Build query
    const query: Record<string, unknown> = { org_id: new Types.ObjectId(tenantId) };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assigned_to = new Types.ObjectId(assignedTo);
    if (source) query.source = source;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query
    const [leads, total] = await Promise.all([
      SouqLead.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("assigned_to", "name email")
        .populate("listing_id", "title price")
        .lean(),
      SouqLead.countDocuments(query),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_more: page * limit < total,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Leads GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Create new lead from property inquiry
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 20, windowMs: 60_000, keyPrefix: "leads:create" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate lead (same phone + listing in last 24h)
    const existing = await SouqLead.findOne({
      org_id: tenantId,
      listing_id: parsed.data.listing_id,
      phone: parsed.data.phone,
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate inquiry - already submitted within 24 hours" },
        { status: 409 }
      );
    }

    // Create lead
    const lead = await SouqLead.create({
      org_id: tenantId,
      listing_id: parsed.data.listing_id,
      property_type: parsed.data.property_type,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      message: parsed.data.message,
      source: parsed.data.source,
      preferred_contact_method: parsed.data.preferred_contact_method,
      preferred_contact_time: parsed.data.preferred_contact_time,
      budget_min: parsed.data.budget_min,
      budget_max: parsed.data.budget_max,
      status: "new",
      priority: "medium",
    });

    // Log activity
    await LeadActivity.create({
      org_id: tenantId,
      lead_id: lead._id,
      type: "note",
      title: "Lead Created",
      title_ar: "تم إنشاء العميل المحتمل",
      description: `Lead submitted via ${parsed.data.source}`,
      description_ar: `تم تقديم العميل المحتمل عبر ${parsed.data.source}`,
      performed_by: userId,
    });

    return NextResponse.json(
      {
        id: lead._id,
        status: lead.status,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Leads POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leads
 * Update lead status, priority, or assignment
 */
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "leads:update" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = UpdateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();

    const { id, status, priority, assigned_to, notes, next_follow_up } = parsed.data;

    // Get current lead for activity logging
    const existingLead = await SouqLead.findOne({
      _id: id,
      org_id: tenantId,
    }).lean();

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build update
    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assigned_to) update.assigned_to = new Types.ObjectId(assigned_to);
    if (notes) update.notes = notes;
    if (next_follow_up) update.next_follow_up = new Date(next_follow_up);

    // Update lead
    const lead = await SouqLead.findByIdAndUpdate(id, update, { new: true });

    // Log activity for status change
    if (status && status !== existingLead.status) {
      await LeadActivity.logStatusChange(
        tenantId,
        lead!._id.toString(),
        existingLead.status,
        status,
        userId
      );
    }

    // Log activity for assignment change
    if (assigned_to && assigned_to !== existingLead.assigned_to?.toString()) {
      await LeadActivity.logAssignment(
        tenantId,
        lead!._id.toString(),
        assigned_to,
        userId
      );
    }

    return NextResponse.json({
      id: lead!._id,
      status: lead!.status,
      updated: true,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[Leads PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}
