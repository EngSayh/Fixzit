import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/superadmin/require';
import { connectMongo } from '@/lib/db/mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { importPendingMaster } from '@/lib/backlog/importPendingMaster';

export async function POST(_req: NextRequest) {
  const sa = await requireSuperadmin();
  if (!sa) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const pendingPath = path.join(process.cwd(), 'PENDING_MASTER.md');

  let md: string;
  try {
    md = await fs.readFile(pendingPath, 'utf-8');
  } catch (_err) {
    return NextResponse.json({ error: 'PENDING_MASTER.md not found' }, { status: 404 });
  }

  const result = await importPendingMaster(md, sa.username);

  return NextResponse.json({ success: true, ...result });
}
