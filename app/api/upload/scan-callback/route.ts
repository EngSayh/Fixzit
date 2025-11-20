import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';

type ScanStatus = 'pending' | 'clean' | 'infected' | 'error';

type ScanDocument = {
  _id: ObjectId;
  key: string;
  status: ScanStatus;
  engine?: string;
  findings?: string[];
  sizeBytes?: number;
  scannedAt: Date;
  receivedAt: Date;
  raw?: unknown;
};

const COLLECTION = 'upload_scans';

const mapStatus = (value: unknown): ScanStatus => {
  if (value === 'clean') return 'clean';
  if (value === 'infected') return 'infected';
  if (value === 'pending') return 'pending';
  return 'error';
};

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-scan-token');
  const expected = process.env.SCAN_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const key = typeof payload?.key === 'string' ? payload.key : '';
    const status = mapStatus(payload?.status);
    if (!key) {
      return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });
    }

    const doc: ScanDocument = {
      _id: new ObjectId(),
      key,
      status,
      engine: typeof payload?.engine === 'string' ? payload.engine : undefined,
      findings: Array.isArray(payload?.findings)
        ? payload.findings.filter((x: unknown) => typeof x === 'string')
        : undefined,
      sizeBytes: typeof payload?.sizeBytes === 'number' ? payload.sizeBytes : undefined,
      scannedAt: payload?.scannedAt ? new Date(payload.scannedAt) : new Date(),
      receivedAt: new Date(),
      raw: payload,
    };

    const db = await getDatabase();
    const collection = db.collection<ScanDocument>(COLLECTION);
    await collection.insertOne(doc);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[ScanCallback] Failed to record scan result', error as Error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
