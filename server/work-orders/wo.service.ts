import { connectToDatabase } from "@/lib/mongodb-unified";
import { withIdempotency } from "@/server/security/idempotency";
// Import the main WorkOrder model instead of defining a duplicate schema
import { WorkOrder } from "@/server/models/WorkOrder";

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
  
  const key = `wo-create-${data.tenantId}-${actorId}-${Date.now()}`;
  const wo = await withIdempotency(key, async () => {
    const code = `WO-${Date.now()}`;
    return await WorkOrder.create({
      ...data,
      code,
      requestedBy: actorId
    });
  });
  
  // Log audit event (simplified without external audit module)
  console.log(`Work order created: ${wo.code} by ${actorId} from ${ip || 'unknown'}`);
  return wo;
}

export async function update(id: string, patch: Partial<WorkOrderInput>, _tenantId: string, actorId: string, ip?: string) {
  await connectToDatabase();
  
  if (!id) {
    throw new Error('Work order ID required');
  }
  if (!patch || Object.keys(patch).length === 0) {
    return await WorkOrder.findById(id);
  }
  
  const updated = await WorkOrder.findByIdAndUpdate(id, patch, { new: true });
  
  // Log audit event (simplified)
  console.log(`Work order updated: ${updated?.code} by ${actorId} from ${ip || 'unknown'}`);
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


