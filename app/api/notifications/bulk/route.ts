import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const bulkActionSchema = z.object({
  action: z.enum(["mark-read", "mark-unread", "archive", "delete"]),
  notificationIds: z.array(z.string())
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, notificationIds } = bulkActionSchema.parse(body);
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  let tenantId: string | null = null;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coll = db.collection('notifications');
  const ids = notificationIds
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  let result: any = { acknowledged: true };
  try {
    if (action === 'mark-read') result = await coll.updateMany({ tenantId, _id: { $in: ids } }, { $set: { read: true } });
    if (action === 'mark-unread') result = await coll.updateMany({ tenantId, _id: { $in: ids } }, { $set: { read: false } });
    if (action === 'archive') result = await coll.updateMany({ tenantId, _id: { $in: ids } }, { $set: { archived: true } });
    if (action === 'delete') result = await coll.deleteMany({ tenantId, _id: { $in: ids } });
  } catch {
    return NextResponse.json({ success: false, total: ids.length, successful: 0, failed: ids.length, results: [] });
  }

  const successful = result.modifiedCount || result.deletedCount || 0;
  return NextResponse.json({
    success: successful === ids.length,
    total: ids.length,
    successful,
    failed: ids.length - successful,
    results: []
  });
}
