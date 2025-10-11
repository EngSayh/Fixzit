import { connectToDatabase } from "@/lib/mongodb-unified";
import { Schema, model, models } from 'mongoose';
import { withIdempotency } from "@/server/security/idempotency";

const _VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ASSIGNED","CANCELLED"],
  ASSIGNED: ["IN_PROGRESS","ON_HOLD","CANCELLED"],
  IN_PROGRESS: ["ON_HOLD","COMPLETED","CANCELLED"],
  ON_HOLD: ["IN_PROGRESS","CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

// Work Order schema
const WorkOrderSchema = new Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'open', 'in-progress', 'completed', 'cancelled'], default: 'draft' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  tenantId: { type: String, required: true, index: true },
  assignedTo: String,
  requestedBy: { type: String, required: true },
  propertyId: String,
  estimatedCost: Number,
  actualCost: Number,
  scheduledDate: Date,
  completedDate: Date,
  notes: String,
}, { timestamps: true });

const WorkOrder = models.WorkOrder || model('WorkOrder', WorkOrderSchema);

export async function create(data: any, actorId: string, ip?: string) {
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

export async function update(id: string, patch: any, _tenantId: string, actorId: string, ip?: string) {
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


