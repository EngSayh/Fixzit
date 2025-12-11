/**
 * @fileoverview FM Marketplace Vendors API
 * @description Manages vendor listings in the FM marketplace.
 * Vendors can register services, bid on work orders, and receive assignments.
 *
 * @route GET /api/fm/marketplace/vendors - List vendors
 * @route POST /api/fm/marketplace/vendors - Register a new vendor
 * @module api/fm/marketplace/vendors
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - VENDOR:VIEW for GET, VENDOR:CREATE for POST
 *
 * Features:
 * - Multi-tenant isolation via orgId
 * - Vendor registration and onboarding
 * - Service category management
 * - Coverage area configuration
 * - Contact information management
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type Contact = {
  name: string;
  title?: string;
  email: string;
  phone?: string;
};

type VendorDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  companyName: string;
  registrationNumber: string;
  website?: string;
  categories?: string;
  coverageAreas?: string;
  deliverySla?: string;
  notes?: string;
  contacts: Contact[];
  status: "pending_review" | "approved";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type VendorPayload = {
  companyName?: string;
  registrationNumber?: string;
  website?: string;
  categories?: string;
  coverageAreas?: string;
  deliverySla?: string;
  notes?: string;
  contacts?: Contact[];
};

const COLLECTION = "fm_marketplace_vendors";

const sanitizePayload = (payload: VendorPayload): VendorPayload => {
  const sanitized: VendorPayload = {};
  if (payload.companyName) sanitized.companyName = payload.companyName.trim();
  if (payload.registrationNumber)
    sanitized.registrationNumber = payload.registrationNumber.trim();
  if (payload.website) sanitized.website = payload.website.trim();
  if (payload.categories) sanitized.categories = payload.categories.trim();
  if (payload.coverageAreas)
    sanitized.coverageAreas = payload.coverageAreas.trim();
  if (payload.deliverySla) sanitized.deliverySla = payload.deliverySla.trim();
  if (payload.notes) sanitized.notes = payload.notes.trim();
  if (Array.isArray(payload.contacts)) {
    sanitized.contacts = payload.contacts.map((c) => ({
      name: (c.name || "").trim(),
      title: c.title?.trim(),
      email: (c.email || "").trim().toLowerCase(),
      phone: c.phone?.trim(),
    }));
  }
  return sanitized;
};

const validatePayload = (payload: VendorPayload): string | null => {
  if (!payload.companyName) return "Company name is required";
  if (!payload.registrationNumber) return "Registration number is required";
  if (!payload.contacts || payload.contacts.length === 0)
    return "At least one contact is required";
  const invalid = payload.contacts.find(
    (c) => !c.name || !c.email.includes("@"),
  );
  if (invalid) return "Each contact requires a name and valid email";
  return null;
};

const mapVendor = (doc: VendorDocument) => ({
  id: doc._id.toString(),
  companyName: doc.companyName,
  registrationNumber: doc.registrationNumber,
  website: doc.website,
  categories: doc.categories,
  coverageAreas: doc.coverageAreas,
  deliverySla: doc.deliverySla,
  notes: doc.notes,
  contacts: doc.contacts,
  status: doc.status,
  createdAt: doc.createdAt,
});

// FUNC-001 FIX: Add GET route for listing vendors
export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.MARKETPLACE,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const q = searchParams.get("q");
    const status = searchParams.get("status");

    // AUDIT-2025-11-29: Use buildTenantFilter for cross-tenant support
    const query: Record<string, unknown> = { ...buildTenantFilter(tenantId) };
    
    // Use $and to combine filters
    const filters: Record<string, unknown>[] = [];
    
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filters.push({ $or: [{ companyName: regex }, { categories: regex }] });
    }
    
    if (status) {
      query.status = status;
    }
    
    if (filters.length > 0) {
      query.$and = filters;
    }

    const db = await getDatabase();
    const collection = db.collection<VendorDocument>(COLLECTION);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(mapVendor),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Marketplace Vendors API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.MARKETPLACE,
      action: FMAction.CREATE,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-29: Pass Super Admin context for proper audit logging
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    // AUDIT-2025-11-29: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for vendor creation" },
        { status: 400 }
      );
    }

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const now = new Date();
    const doc: VendorDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-29: Changed from org_id
      companyName: payload.companyName!,
      registrationNumber: payload.registrationNumber!,
      website: payload.website,
      categories: payload.categories,
      coverageAreas: payload.coverageAreas,
      deliverySla: payload.deliverySla,
      notes: payload.notes,
      contacts: payload.contacts || [],
      status: "pending_review",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<VendorDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapVendor(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Marketplace Vendors API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
