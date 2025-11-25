import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey } from "@/domain/fm/fm.behavior";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { FMErrors } from "@/app/api/fm/errors";

type ExpenseStatus = "pending" | "approved" | "rejected";

type ExpenseDocument = {
  _id: ObjectId;
  org_id: string;
  vendor: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  status: ExpenseStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ExpensePayload = {
  vendor?: string;
  category?: string;
  amount?: number;
  currency?: string;
  description?: string;
};

const COLLECTION = "fm_expenses";

const sanitizePayload = (payload: ExpensePayload): ExpensePayload => {
  const sanitized: ExpensePayload = {};
  if (payload.vendor) sanitized.vendor = payload.vendor.trim();
  if (payload.category) sanitized.category = payload.category.trim();
  if (typeof payload.amount === "number" && Number.isFinite(payload.amount)) {
    sanitized.amount = payload.amount;
  }
  if (payload.currency)
    sanitized.currency = payload.currency.trim().toUpperCase();
  if (payload.description) sanitized.description = payload.description.trim();
  return sanitized;
};

const validatePayload = (payload: ExpensePayload): string | null => {
  if (!payload.vendor) return "Vendor is required";
  if (!payload.category) return "Category is required";
  if (typeof payload.amount !== "number" || payload.amount <= 0)
    return "Amount must be greater than 0";
  if (!payload.currency) return "Currency is required";
  return null;
};

const mapExpense = (doc: ExpenseDocument) => ({
  id: doc._id.toString(),
  vendor: doc.vendor,
  category: doc.category,
  amount: doc.amount,
  currency: doc.currency,
  description: doc.description,
  status: doc.status,
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

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
    );

    const query: Record<string, unknown> = { org_id: tenantId };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      query.$or = [
        { vendor: regex },
        { category: regex },
        { description: regex },
      ];
    }

    const db = await getDatabase();
    const collection = db.collection<ExpenseDocument>(COLLECTION);
    const items = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, data: items.map(mapExpense) });
  } catch (error) {
    logger.error("FM Expenses API - GET error", error as Error);
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
    const doc: ExpenseDocument = {
      _id: new ObjectId(),
      org_id: tenantId,
      vendor: payload.vendor!,
      category: payload.category!,
      amount: payload.amount!,
      currency: payload.currency || "SAR",
      description: payload.description,
      status: "pending",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDatabase();
    const collection = db.collection<ExpenseDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json(
      { success: true, data: mapExpense(doc) },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Expenses API - POST error", error as Error);
    return FMErrors.internalError();
  }
}
