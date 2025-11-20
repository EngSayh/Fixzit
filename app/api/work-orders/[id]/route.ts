import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { WOPriority } from "@/server/work-orders/wo.schema";

import { createSecureResponse } from '@/server/security/headers';

const attachmentInputSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().optional(),
  type: z.string().optional(),
  scanStatus: z.enum(["pending", "clean", "infected", "error"]).default("pending"),
});

type AttachmentInput = z.infer<typeof attachmentInputSchema>;

function normalizeAttachments(attachments: AttachmentInput[], userId: string) {
  return attachments.map((att) => ({
    key: att.key,
    fileName: att.name || att.key.split('/').pop() || att.key,
    originalName: att.name || att.key,
    fileUrl: att.url,
    fileType: att.type,
    fileSize: att.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
    category: 'WORK_ORDER',
    description: att.scanStatus === 'infected' ? 'Virus detected' : undefined,
    isPublic: false,
    scanStatus: att.scanStatus ?? 'pending',
  }));
}

/**
 * @openapi
 * /api/work-orders/[id]:
 *   get:
 *     summary: work-orders/[id] operations
 *     tags: [work-orders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }>}): Promise<NextResponse> {
  const params = await props.params;
  await connectToDatabase();
  const wo = (await WorkOrder.findById(params.id));
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, _req);
  return createSecureResponse(wo, 200, _req);
}

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: WOPriority.optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  attachments: z.array(attachmentInputSchema).optional()
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }>}): Promise<NextResponse> {
  const params = await props.params;
  const user = await requireAbility("EDIT")(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();
  const updates = patchSchema.parse(await req.json());
  const updatePayload: Record<string, unknown> = { ...updates };

  if (updates.priority) {
    const { slaMinutes, dueAt } = resolveSlaTarget(updates.priority as WorkOrderPriority);
    updatePayload.slaMinutes = slaMinutes;
    if (!updates.dueAt) {
      updatePayload.dueAt = dueAt;
    }
  }

  if (updates.dueAt) {
    updatePayload.dueAt = new Date(updates.dueAt);
  }

  if (updates.attachments) {
    updatePayload.attachments = normalizeAttachments(updates.attachments as AttachmentInput[], user.id);
  }

  const wo = (await WorkOrder.findOneAndUpdate(
    { _id: params.id, tenantId: user.tenantId },
    { $set: updatePayload },
    { new: true }
  ));
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);
  return createSecureResponse(wo, 200, req);
}
