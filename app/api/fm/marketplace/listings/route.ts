import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type ListingDocument = {
  _id: ObjectId;
  org_id: string;
  title: string;
  sku: string;
  fsin?: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  compliance: string[];
  status: "draft" | "pending_review";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ListingPayload = {
  title?: string;
  sku?: string;
  fsin?: string;
  category?: string;
  price?: number;
  stock?: number;
  description?: string;
  compliance?: string[];
};

const COLLECTION = "fm_marketplace_listings";

const sanitizePayload = (payload: ListingPayload): ListingPayload => {
  const sanitized: ListingPayload = {};
  if (payload.title) sanitized.title = payload.title.trim();
  if (payload.sku) sanitized.sku = payload.sku.trim();
  if (payload.fsin) sanitized.fsin = payload.fsin.trim();
  if (payload.category) sanitized.category = payload.category.trim();
  if (typeof payload.price === "number" && Number.isFinite(payload.price)) {
    sanitized.price = payload.price;
  }
  if (typeof payload.stock === "number" && Number.isFinite(payload.stock)) {
    sanitized.stock = payload.stock;
  }
  if (payload.description) sanitized.description = payload.description.trim();
  if (Array.isArray(payload.compliance))
    sanitized.compliance = payload.compliance.map((c) => c.trim());
  return sanitized;
};

const validatePayload = (payload: ListingPayload): string | null => {
  if (!payload.title) return "Title is required";
  if (!payload.sku) return "SKU is required";
  if (!payload.category) return "Category is required";
  if (typeof payload.price !== "number" || payload.price <= 0)
    return "Price must be greater than 0";
  if (typeof payload.stock !== "number" || payload.stock < 0)
    return "Stock must be zero or greater";
  if (!payload.compliance || payload.compliance.length === 0)
    return "Compliance checklist must be confirmed";
  return null;
};

const mapListing = (doc: ListingDocument) => ({
  id: doc._id.toString(),
  title: doc.title,
  sku: doc.sku,
  fsin: doc.fsin,
  category: doc.category,
  price: doc.price,
  stock: doc.stock,
  description: doc.description,
  compliance: doc.compliance,
  status: doc.status,
  createdAt: doc.createdAt,
});

// FUNC-002 FIX: Add GET route for listing marketplace items
export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.MARKETPLACE,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
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
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = { org_id: tenantId };
    
    // Use $and to combine filters
    const filters: Record<string, unknown>[] = [];
    
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filters.push({ $or: [{ title: regex }, { sku: regex }, { description: regex }] });
    }
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (filters.length > 0) {
      query.$and = filters;
    }

    const db = await getDatabase();
    const collection = db.collection<ListingDocument>(COLLECTION);
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
      data: items.map(mapListing),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Marketplace Listings API - GET error", error as Error);
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

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const payload = sanitizePayload(await req.json());
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const now = new Date();
    const doc: ListingDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      title: payload.title!,
      sku: payload.sku!,
      fsin: payload.fsin,
      category: payload.category!,
      price: payload.price!,
      stock: payload.stock ?? 0,
      description: payload.description,
      compliance: payload.compliance || [],
      status: "pending_review",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<ListingDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapListing(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Marketplace Listings API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
