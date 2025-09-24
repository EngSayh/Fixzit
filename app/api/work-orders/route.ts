import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { z } from "zod";
import { getSessionUser, requireAbility } from "@/src/server/middleware/withAuthRbac";
import { computeDueAt, computeSlaMinutes } from "@/src/lib/sla";
import { isMockDB } from "@/src/lib/mongo";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
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

export async function GET(req: NextRequest) {
  await db; // This will work with mock DB too
  const user = await getSessionUser(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const match: any = { tenantId: user.tenantId, deletedAt: { $exists: false } };
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (q) match.$text = { $search: q };

  // Handle both mock and real database
  let items: any[] = [];
  let total = 0;

  if (isMockDB) {
    // Mock store returns arrays; do manual sort/pagination
    const raw = await (WorkOrder as any).find(match);
    items = Array.isArray(raw) ? raw : [];
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    total = await (WorkOrder as any).countDocuments(match);
    const start = (page - 1) * limit;
    items = items.slice(start, start + limit);
  } else {
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
  await db;

  const body = await req.json();
  const data = createSchema.parse(body);

  // generate code per-tenant sequence (simplified)
  const seq = Math.floor((Date.now() / 1000) % 100000);
  const code = `WO-${new Date().getFullYear()}-${seq}`;

  const createdAt = new Date();
  const slaMinutes = computeSlaMinutes(data.priority as any);
  const dueAt = computeDueAt(createdAt, slaMinutes);

  const wo = await (WorkOrder as any).create({
    tenantId: user.tenantId,
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