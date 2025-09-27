import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["work-order", "vendor", "payment", "maintenance", "system"]),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["maintenance", "vendor", "finance", "system"]),
  tenantId: z.string().optional()
});

// All operations now backed by Mongo collection (tenant-scoped)

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const priority = searchParams.get("priority") || "";
  const read = searchParams.get("read") || "";
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notifications } = await getCollections();
  const filter: any = { tenantId };
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { message: { $regex: safe, $options: 'i' } }
    ];
  }
  if (category && category !== 'all') filter.category = category;
  if (priority && priority !== 'all') filter.priority = priority;
  if (read !== '') filter.read = read === 'true';

  const skip = (page - 1) * limit;
  const [rawItems, total] = await Promise.all([
    notifications.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
    notifications.countDocuments(filter)
  ]);
  const items = rawItems.map((n: any) => ({ id: String(n._id), ...n, _id: undefined }));

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total
  });
}

export async function POST(req: NextRequest) {
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = notificationSchema.parse(body);
  const { notifications } = await getCollections();
  const doc = {
    tenantId,
    type: data.type,
    title: data.title,
    message: data.message,
    priority: data.priority,
    category: data.category,
    timestamp: new Date().toISOString(),
    read: false,
    archived: false
  } as any;

  const result = await notifications.insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
}

