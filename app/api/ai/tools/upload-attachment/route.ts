// app/api/ai/tools/upload-attachment/route.ts - Attach a photo/file to a work order
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { getDatabase } from 'lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadFromDataUrl } from '@/src/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workOrderId, fileUrl, dataUrl, caption } = await req.json();
    if (!workOrderId || (!fileUrl && !dataUrl)) {
      return NextResponse.json({ error: 'workOrderId and file required' }, { status: 400 });
    }

    const db = await getDatabase();
    const col = db.collection<Record<string, any>>('work_orders');
    const wo = await col.findOne({ _id: new ObjectId(workOrderId), orgId: user.orgId });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    let finalUrl: string | null = fileUrl || null;
    if (!finalUrl && dataUrl) {
      const uploaded = await uploadFromDataUrl(dataUrl, `work-orders/${workOrderId}`);
      finalUrl = uploaded.url;
    }

    const attachment = {
      id: new ObjectId().toString(),
      byUserId: user.id,
      byRole: user.role,
      caption: caption || null,
      fileUrl: finalUrl,
      dataUrl: null,
      createdAt: new Date()
    } as const;

    const updateDoc: any = {
      $push: { attachments: attachment },
      $set: { updatedAt: new Date() }
    };

    await col.updateOne(
      { _id: new ObjectId(workOrderId) },
      updateDoc
    );

    return NextResponse.json({ success: true, data: { attachmentId: attachment.id, fileUrl: attachment.fileUrl, message: 'Attached' } });
  } catch (e) {
    console.error('Upload attachment error:', e);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}


