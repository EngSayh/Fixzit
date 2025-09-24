import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";

const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["work-order", "vendor", "payment", "maintenance", "system"]),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["maintenance", "vendor", "finance", "system"]),
  tenantId: z.string().optional()
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const priority = searchParams.get("priority") || "";
  const read = searchParams.get("read") || "";
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);

  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ items: [], total: 0, page, limit, hasMore: false });

  const match: any = {};
  if (q) match.$text = { $search: q };
  if (category && category !== 'all') match.category = category;
  if (priority && priority !== 'all') match.priority = priority;
  if (read !== '') match.read = read === 'true';

  const coll = db.collection('notifications');
  const total = await coll.countDocuments(match).catch(() => 0);
  const items = await coll
    .find(match)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()
    .catch(() => []);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total
  });
}

export async function POST(req: NextRequest) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await req.json();
  const data = notificationSchema.parse(body);

  const doc = {
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority,
    category: data.category,
    tenantId: data.tenantId || 't-001',
    read: false,
    timestamp: new Date().toISOString(),
  };

  const res = await db.collection('notifications').insertOne(doc);
  return NextResponse.json({ _id: res.insertedId, ...doc }, { status: 201 });
}

