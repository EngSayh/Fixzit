import { logger } from '@/lib/logger';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { withIdempotency, createIdempotencyKey } from "@/server/security/idempotency";
// Import the main WorkOrder model instead of defining a duplicate schema
import { WorkOrder } from "@/server/models/WorkOrder";
// Import Zod validation schemas
import { WoCreate, WoUpdate } from "./wo.schema";

const _VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ASSIGNED","CANCELLED"],
  ASSIGNED: ["IN_PROGRESS","ON_HOLD","CANCELLED"],
  IN_PROGRESS: ["ON_HOLD","COMPLETED","CANCELLED"],
  ON_HOLD: ["IN_PROGRESS","CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

// DUPLICATE SCHEMA REMOVED: Now using the main WorkOrder model from server/models/WorkOrder.ts
// This fixes the mongoose duplicate schema registration issue where two different schemas
// were both trying to register as 'WorkOrder' model

export interface WorkOrderInput {
  title: string;
  description?: string;
  status?: 'draft' | 'open' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tenantId: string;
  assignedTo?: string;
  propertyId?: string;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
}

export async function create(data: WorkOrderInput, actorId: string, ip?: string) {
  await connectToDatabase();
  
  // ⚡ FIXED: Validate input with Zod schema
  const validated = WoCreate.parse(data);
  
  // ⚡ FIXED: Use deterministic idempotency key based on payload content
  // This ensures that duplicate requests with the same data are truly idempotent
  const key = createIdempotencyKey('wo-create', { ...validated, actorId });
  
  const wo = await withIdempotency(key, async () => {
    const code = `WO-${Date.now()}`;
    return await WorkOrder.create({
      ...validated,
      code,
      requestedBy: actorId
    });
  });
  
  // Log audit event (simplified without external audit module)
  // TODO(schema-migration): Use workOrderNumber instead of code
  logger.info(`Work order created: ${(wo as any).code} by ${actorId} from ${ip || 'unknown'}`);
  return wo;
}

export async function update(id: string, patch: Partial<WorkOrderInput>, tenantId: string, actorId: string, ip?: string) {
  await connectToDatabase();
  
  if (!id) {
    throw new Error('Work order ID required');
  }
  if (!patch || Object.keys(patch).length === 0) {
    return await WorkOrder.findById(id);
  }
  
  // ⚡ FIXED: Validate input with Zod schema
  const validated = WoUpdate.parse(patch);
  
  // ⚡ FIXED: Fetch existing work order to check state transitions
  const existing = await WorkOrder.findById(id);
  if (!existing) {
    throw new Error(`Work order not found: ${id}`);
  }
  
  // ⚡ FIXED: Verify tenant ownership (multi-tenant security)
  // TODO(schema-migration): Verify tenantId is in schema or use proper tenant field
  if ((existing as any).tenantId !== tenantId) {
    throw new Error(`Work order not found: ${id}`); // Don't leak existence
  }
  
  // ⚡ FIXED: Validate state machine transitions if status is changing
  if (validated.status && validated.status !== existing.status) {
    const validTransitions = _VALID_TRANSITIONS[existing.status] || [];
    if (!validTransitions.includes(validated.status)) {
      throw new Error(
        `Invalid state transition from ${existing.status} to ${validated.status}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }
  }
  
  const updated = await WorkOrder.findByIdAndUpdate(id, validated, { new: true });
  
  // Log audit event (simplified)
  // TODO(schema-migration): Use workOrderNumber instead of code
  logger.info(`Work order updated: ${(updated as any)?.code} by ${actorId} from ${ip || 'unknown'}`);
  return updated;
}

export async function list(tenantId: string, q?: string, status?: string) {
  await connectToDatabase();
  
  const filters: Record<string, unknown> = { tenantId };
  
  if (status) {
    filters.status = status;
  }
  
  if (q) {
    filters.$or = [
      { code: new RegExp(q, 'i') },
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') }
    ];
  }
  
  return await WorkOrder.find(filters).sort({ createdAt: -1 }).lean();
}


