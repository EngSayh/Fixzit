import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/src/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/src/lib/sla";
import { WOPriority } from "@/src/server/work-orders/wo.schema";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: WOPriority.default("MEDIUM"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  requester: z.object({
    type: z.enum(["TENANT","OWNER","STAFF"]).default("TENANT"),
    id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }).optional()
});

/**
 * Fetches a paginated list of work orders for the authenticated user's tenant.
 *
 * The handler reads query parameters `q` (text search), `status`, `priority`, `page` (default 1),
 * and `limit` (default 20, capped at 100). Results are always scoped to the session user's
 * tenantId and exclude soft-deleted records (deletedAt exists). Database access is initialized
 * before querying.
 *
 * Behavior differs based on the environment flag USE_MOCK_DB="true" (case-insensitive):
 * - When true, results are retrieved from the mock store, sorted by createdAt (desc) in-memory,
 *   and then paginated.
 * - Otherwise, results are queried from the real database with server-side sort/skip/limit.
 *
 * @returns A NextResponse JSON object with shape `{ items, page, limit, total }`.
 */
export async function GET(req: NextRequest) {
  await connectDb();
  const user = await getSessionUser(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const match: any = { tenantId: (user as any)?.orgId, deletedAt: { $exists: false } };
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (q) match.$text = { $search: q };

  // Handle both mock and real database
  let items: any[];
  let total: number;

  // Respect explicit mock flag only
  const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

  if (isMockDB) {
    // Use mock database logic
    items = await (WorkOrder as any).find(match);
    if (items && Array.isArray(items)) {
      // Sort manually
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Apply pagination
      items = items.slice((page - 1) * limit, page * limit);
    } else {
      items = [];
    }
    total = await (WorkOrder as any).countDocuments(match);
  } else {
    // Use real Mongoose
    items = await (WorkOrder as any).find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    total = await (WorkOrder as any).countDocuments(match);
  }

  return NextResponse.json({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const user = await requireAbility("CREATE")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();

  const body = await req.json();
  const data = createSchema.parse(body);

  const createdAt = new Date();
  // Generate cryptographically secure work order code
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const code = `WO-${new Date().getFullYear()}-${uuid}`;
  const { slaMinutes, dueAt } = resolveSlaTarget(data.priority as WorkOrderPriority, createdAt);

  const wo = await (WorkOrder as any).create({
    tenantId: (user as any)?.orgId,
    code,
    title: data.title,
    description: data.description,
    priority: data.priority,
    category: data.category,
    subcategory: data.subcategory,
    propertyId: data.propertyId,
    unitId: data.unitId,
    requester: data.requester,
    status: "SUBMITTED",
    statusHistory: [{ from: "DRAFT", to: "SUBMITTED", byUserId: user.id, at: new Date() }],
    slaMinutes,
    dueAt,
    createdBy: user.id,
    createdAt
  });
  return NextResponse.json(wo, { status: 201 });
}
