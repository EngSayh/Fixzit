import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const doc = await notifications.findOne({ _id: _id as any, tenantId });
  if (!doc) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  const { _id: rawId, ...rest } = doc as any;
  return NextResponse.json({ id: String(rawId), ...rest });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { read, archived } = body as { read?: boolean; archived?: boolean };
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const update: any = { $set: { updatedAt: new Date() } };
  if (typeof read === 'boolean') update.$set.read = read;
  if (typeof archived === 'boolean') update.$set.archived = archived;

  const updated = await notifications.findOneAndUpdate({ _id: _id as any, tenantId }, update, { returnDocument: 'after' });
  const value = updated as any;
  if (!value) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  const normalized = { id: String(value._id), ...value, _id: undefined };
  return NextResponse.json(normalized);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { notifications } = await getCollections();
  const _id = (() => { try { return new ObjectId(params.id); } catch { return null; } })();
  if (!_id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const res = await notifications.deleteOne({ _id: _id as any, tenantId });
  if (!res.deletedCount) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
