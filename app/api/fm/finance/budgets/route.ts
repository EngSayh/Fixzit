import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { FMErrors } from "@/app/api/fm/errors";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId, buildTenantFilter, isCrossTenantMode } from "@/app/api/fm/utils/tenant";

type BudgetDocument = {
  _id: ObjectId;
  orgId: string; // AUDIT-2025-11-26: Changed from org_id to orgId for consistency
  name: string;
  department: string;
  allocated: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetPayload = {
  name?: string;
  department?: string;
  allocated?: number;
  currency?: string;
};

const COLLECTION = "fm_budgets";

const sanitizePayload = (payload: BudgetPayload) => {
  const sanitized: BudgetPayload = {};
  if (payload.name) sanitized.name = payload.name.trim();
  if (payload.department) sanitized.department = payload.department.trim();
  if (
    typeof payload.allocated === "number" &&
    Number.isFinite(payload.allocated)
  ) {
    sanitized.allocated = payload.allocated;
  }
  if (payload.currency)
    sanitized.currency = payload.currency.trim().toUpperCase();
  return sanitized;
};

const validatePayload = (payload: BudgetPayload): string | null => {
  if (!payload.name) return "Name is required";
  if (!payload.department) return "Department is required";
  if (typeof payload.allocated !== "number" || payload.allocated <= 0)
    return "Allocated amount must be > 0";
  if (!payload.currency) return "Currency is required";
  return null;
};

const mapBudget = (doc: BudgetDocument) => ({
  id: doc._id.toString(),
  name: doc.name,
  department: doc.department,
  allocated: doc.allocated,
  currency: doc.currency,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    const query: Record<string, unknown> = { ...buildTenantFilter(tenantId) }; // AUDIT-2025-11-27: Handle cross-tenant mode
    // SEC-001 FIX: Use $and pattern for search to prevent overwriting role-based filters
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = { $regex: escaped, $options: "i" } as Record<
        string,
        unknown
      >;
      // Use $and to combine org filter with search filter
      query.$and = [{ $or: [{ name: expression }, { department: expression }] }];
    }

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items.map(mapBudget),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Budgets API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireFmPermission(req, {
      module: ModuleKey.FINANCE,
      action: FMAction.CREATE,
    });
    if (actor instanceof NextResponse) return actor;

    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
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

    // AUDIT-2025-11-27: Reject cross-tenant mode for POST (must specify explicit tenant)
    if (isCrossTenantMode(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Super Admin must specify tenant context for budget creation" },
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
    const doc: BudgetDocument = {
      _id: new ObjectId(),
      orgId: tenantId, // AUDIT-2025-11-26: Changed from org_id
      name: payload.name!,
      department: payload.department!,
      allocated: payload.allocated!,
      currency: payload.currency || "SAR",
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<BudgetDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapBudget(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Budgets API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
