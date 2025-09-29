import { prisma } from "@/server/db/client";

export async function audit(tenantId: string, actorId: string|undefined, action: string, entity: string, payload?: any, ip?: string) {
  await prisma.auditLog.create({ 
    data: { 
      tenantId, 
      actorId, 
      action, 
      entity, 
      payload, 
      ip 
    }
  });
}

