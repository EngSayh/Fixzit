import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let tenantId: string | null = null;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const item = await db.collection('notifications').findOne({ _id: new ObjectId(params.id), tenantId }).catch(() => null);
  if (!item) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let tenantId: string | null = null;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const update: any = {};
  if (typeof body.read === 'boolean') update.read = body.read;
  if (typeof body.archived === 'boolean') update.archived = body.archived;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  const _id = new ObjectId(params.id);
  const res = await db.collection('notifications').updateOne({ _id, tenantId }, { $set: update });
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  const item = await db.collection('notifications').findOne({ _id, tenantId }).catch(() => null);
  if (!item) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let tenantId: string | null = null;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = await db.collection('notifications').deleteOne({ _id: new ObjectId(params.id), tenantId });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
