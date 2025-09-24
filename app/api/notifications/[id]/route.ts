import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  const item = await db.collection('notifications').findOne({ _id: new ObjectId(params.id) }).catch(() => null);
  if (!item) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  const body = await req.json();
  const update: any = {};
  if (typeof body.read === 'boolean') update.read = body.read;
  if (typeof body.archived === 'boolean') update.archived = body.archived;
  await db.collection('notifications').updateOne({ _id: new ObjectId(params.id) }, { $set: update });
  const item = await db.collection('notifications').findOne({ _id: new ObjectId(params.id) });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDatabase().catch(() => null);
  if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  await db.collection('notifications').deleteOne({ _id: new ObjectId(params.id) });
  return NextResponse.json({ success: true });
}
