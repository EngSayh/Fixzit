import { AuditLog } from "@/src/server/models/AuditLog";

export async function audit(tenantId: string, actorId: string|undefined, action: string, entity: string, payload?: any, ip?: string) {
  await AuditLog.create({ tenantId, actorId, action, entity, payload, ip });
}

