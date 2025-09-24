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
  const body = await req.json();
  const update: any = {};
  if (typeof body.read === 'boolean') update.read = body.read;
  if (typeof body.archived === 'boolean') update.archived = body.archived;
  await db.collection('notifications').updateOne({ _id: new ObjectId(params.id), tenantId }, { $set: update });
  const item = await db.collection('notifications').findOne({ _id: new ObjectId(params.id), tenantId });
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
  await db.collection('notifications').deleteOne({ _id: new ObjectId(params.id), tenantId });
  return NextResponse.json({ success: true });
}
