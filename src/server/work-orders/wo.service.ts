import { WoCreate, WoUpdate } from "./wo.schema";
import * as repo from "./wo.repo";
import { audit } from "@/server/utils/audit";
import { withIdempotency, createIdempotencyKey } from "@/server/security/idempotency";

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ASSIGNED","CANCELLED"],
  ASSIGNED: ["IN_PROGRESS","ON_HOLD","CANCELLED"],
  IN_PROGRESS: ["ON_HOLD","COMPLETED","CANCELLED"],
  ON_HOLD: ["IN_PROGRESS","CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export async function create(input: unknown, actorId?: string, ip?: string) {
  const data = WoCreate.parse(input);
  const key = createIdempotencyKey("wo:create", { tenantId: data.tenantId, payload: data });
  const wo = await withIdempotency(key, () => repo.woCreate(data));
  await audit(data.tenantId, actorId, "wo.create", `workOrder:${wo.code}`, { wo }, ip);
  return wo;
}

export async function update(id: string, input: unknown, tenantId: string, actorId?: string, ip?: string) {
  const patch = WoUpdate.parse(input);
  if (patch.status) {
    const existing = await repo.woGet(id);
    if (!existing || existing.tenantId !== tenantId) throw new Error("Not found");
    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(patch.status)) throw new Error(`Invalid transition ${existing.status} -> ${patch.status}`);
  }
  const updated = await repo.woUpdate(id, patch);
  await audit(tenantId, actorId, "wo.update", `workOrder:${updated.code}`, { patch }, ip);
  return updated;
}

export async function list(tenantId: string, q?: string, status?: string) {
  return repo.woList(tenantId, q, status);
}

