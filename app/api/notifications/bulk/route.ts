import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { ObjectId } from "mongodb";

const bulkActionSchema = z.object({
  action: z.enum(["mark-read", "mark-unread", "archive", "delete"]),
  notificationIds: z.array(z.string())
});

export async function POST(req: NextRequest) {
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.orgId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, notificationIds } = bulkActionSchema.parse(body);
  const { notifications } = await getCollections();

  const toObjectId = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
  const ids = notificationIds.map(toObjectId).filter(Boolean) as ObjectId[];
  const filter = { _id: { $in: ids }, tenantId } as any;

  let res: any;
  if (action === 'delete') {
    res = await notifications.deleteMany(filter);
    if (!res.deletedCount) return NextResponse.json({ error: 'No notifications found to delete' }, { status: 404 });
  } else if (action === 'archive') {
    res = await notifications.updateMany(filter, { $set: { archived: true, updatedAt: new Date() } });
    if (!res.modifiedCount) return NextResponse.json({ error: 'No notifications found to archive' }, { status: 404 });
  } else if (action === 'mark-read') {
    res = await notifications.updateMany(filter, { $set: { read: true, updatedAt: new Date() } });
    if (!res.modifiedCount) return NextResponse.json({ error: 'No notifications found to mark as read' }, { status: 404 });
  } else if (action === 'mark-unread') {
    res = await notifications.updateMany(filter, { $set: { read: false, updatedAt: new Date() } });
    if (!res.modifiedCount) return NextResponse.json({ error: 'No notifications found to mark as unread' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
