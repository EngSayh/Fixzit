import { WorkOrder } from "@/src/server/models/WorkOrder";
import type { WoCreateInput, WoUpdateInput } from "./wo.schema";

function pad(num: number, size = 6) { return String(num).padStart(size, "0"); }

export async function woCreate(data: WoCreateInput) {
  const count = await (WorkOrder as any).countDocuments({ tenantId: data.tenantId });
  const code = `WO-${pad(count + 1)}`;
  return (WorkOrder as any).create({ ...data, code });
}

export async function woUpdate(id: string, patch: WoUpdateInput) {
  return (WorkOrder as any).findByIdAndUpdate(id, { $set: patch }, { new: true });
}

export async function woGet(id: string) {
  return (WorkOrder as any).findById(id);
}

export async function woList(tenantId: string, q?: string, status?: string) {
  const filter: any = { tenantId };
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q };
  return (WorkOrder as any).find(filter).sort({ createdAt: -1 }).limit(200);
}

