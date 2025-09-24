// app/api/ai/tools/upload-attachment/route.ts - Attach a photo/file to a work order
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { getDatabase } from 'lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadFromDataUrl } from '@/src/lib/storage';

/**
 * Attach a photo or file to a work order.
 *
 * Authenticates the requester, validates the request body, optionally uploads a base64 data URL to storage,
 * appends a new attachment entry to the work order's `attachments` array, and returns the attachment id and URL.
 *
 * Expected request JSON body:
 * - `workOrderId` (string, required): Target work order _id.
 * - `fileUrl` (string, optional): Public URL of an existing file.
 * - `dataUrl` (string, optional): Base64 data URL to upload when `fileUrl` is not provided.
 * - `caption` (string, optional): Attachment caption.
 *
 * Responses:
 * - 200: { success: true, data: { attachmentId, fileUrl, message: 'Attached' } }
 * - 400: { error: 'workOrderId and file required' } when required fields are missing
 * - 401: { error: 'Unauthorized' } when no authenticated user
 * - 404: { error: 'Work order not found' } when the work order doesn't exist or doesn't belong to the user's org
 * - 500: { error: 'Failed to upload attachment' } on unexpected server errors
 *
 * @param req - NextRequest whose JSON body contains the fields described above.
 * @returns A NextResponse with success or error JSON as described.
 */
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


