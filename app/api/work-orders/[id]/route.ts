import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { z } from "zod";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import type { Ability } from "@/server/rbac/workOrdersPolicy";
import { resolveSlaTarget, WorkOrderPriority } from "@/lib/sla";
import { WOPriority } from "@/server/work-orders/wo.schema";

import { createSecureResponse } from '@/server/security/headers';
import { deleteObject } from '@/lib/storage/s3';

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
  propertyId: z.string().optional(),
  unitNumber: z.string().optional(),
  assignment: z.object({
    assignedTo: z.object({
      userId: z.string().optional()
    }).optional()
  }).optional(),
  attachments: z.array(attachmentInputSchema).optional()
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }>}): Promise<NextResponse> {
  const params = await props.params;
  const ability: Ability = "EDIT"; // Type-safe: must match Ability union type
  const user = await requireAbility(ability)(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();
  const updates = patchSchema.parse(await req.json());
  const updatePayload: Record<string, unknown> = { ...updates };

  // Validate property existence if provided
  if (updates.propertyId) {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const { ObjectId } = await import('mongodb');
    const db = await getDatabase();
    const propertyExists = await db.collection('properties').countDocuments({
      _id: new ObjectId(updates.propertyId),
      org_id: user.tenantId
    });
    if (!propertyExists) {
      return createSecureResponse({ error: 'Invalid propertyId: property not found' }, 422, req);
    }
  }

  // Validate assignee existence if provided
  if (updates.assignment?.assignedTo?.userId) {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const { ObjectId } = await import('mongodb');
    const db = await getDatabase();
    const userExists = await db.collection('users').countDocuments({
      _id: new ObjectId(updates.assignment.assignedTo.userId),
      orgId: user.tenantId
    });
    if (!userExists) {
      return createSecureResponse({ error: 'Invalid assignee: user not found' }, 422, req);
    }
  }

  // Handle location fields
  if (updates.propertyId || updates.unitNumber) {
    updatePayload.location = {
      ...(updates.propertyId ? { propertyId: updates.propertyId } : {}),
      ...(updates.unitNumber ? { unitNumber: updates.unitNumber } : {})
    };
    delete updatePayload.propertyId;
    delete updatePayload.unitNumber;
  }

  // Handle assignment with timestamp
  if (updates.assignment?.assignedTo?.userId) {
    updatePayload.assignment = {
      assignedTo: { userId: updates.assignment.assignedTo.userId },
      assignedAt: new Date()
    };
  }

  // Recalculate SLA on priority change
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

  let removedKeys: string[] = [];
  if (updates.attachments) {
    // Fetch existing to calculate removed attachments for cleanup
    const existing = await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId })
      .select({ attachments: 1 })
      .lean<{ attachments?: { key?: string }[] } | null>();
    const existingKeys = new Set((existing?.attachments || []).map((att) => att.key).filter(Boolean) as string[]);
    const next = normalizeAttachments(updates.attachments as AttachmentInput[], user.id);
    updatePayload.attachments = next;
    const nextKeys = new Set(next.map((att) => att.key));
    removedKeys = [...existingKeys].filter((k) => !nextKeys.has(k));
  }

  const wo = (await WorkOrder.findOneAndUpdate(
    { _id: params.id, tenantId: user.tenantId },
    { $set: updatePayload },
    { new: true }
  ));
  if (!wo) return createSecureResponse({ error: "Not found" }, 404, req);

  if (removedKeys.length) {
    const { logger } = await import('@/lib/logger');
    // Delete removed attachments from S3 with observability
    const deleteResults = await Promise.allSettled(
      removedKeys.map((key) => deleteObject(key))
    );

    // Log failures for monitoring
    deleteResults.forEach((result, idx) => {
      if (result.status === 'rejected') {
        logger.error('[WorkOrder PATCH] S3 cleanup failed', {
          workOrderId: params.id,
          key: removedKeys[idx],
          error: result.reason
        });
      }
    });

    const failedKeys = deleteResults
      .map((result, idx) => (result.status === 'rejected' ? removedKeys[idx] : null))
      .filter((key): key is string => Boolean(key));

    if (failedKeys.length === 0) {
      logger.info('[WorkOrder PATCH] S3 cleanup success', {
        workOrderId: params.id,
        total: removedKeys.length
      });
    } else {
      logger.warn('[WorkOrder PATCH] S3 cleanup partial failure', {
        workOrderId: params.id,
        total: removedKeys.length,
        failed: failedKeys.length
      });

      try {
        const { JobQueue } = await import('@/lib/jobs/queue');
        const jobId = await JobQueue.enqueue('s3-cleanup', {
          keys: failedKeys,
          workOrderId: params.id,
          source: 'work-order-patch'
        });

        logger.info('[WorkOrder PATCH] S3 cleanup retry enqueued', {
          workOrderId: params.id,
          failedKeys: failedKeys.length,
          jobId
        });
      } catch (error) {
        logger.error('[WorkOrder PATCH] Failed to enqueue cleanup retry', error as Error, {
          workOrderId: params.id,
          failedKeys
        });
      }
    }
  }

  return createSecureResponse(wo, 200, req);
}
