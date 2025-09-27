import { prisma } from "@/server/db/client";
import { Prisma } from "@prisma/client";
import type { WoCreateInput, WoUpdateInput } from "./wo.schema";

function pad(num: number, size = 6) { return String(num).padStart(size,"0"); }

export async function woCreate(data: WoCreateInput) {
  return prisma.$transaction(
    async tx => {
      const latest = await tx.workOrder.findFirst({
        where: { tenantId: data.tenantId },
        orderBy: { code: "desc" },
        select: { code: true }
      });

      const nextNumber = (() => {
        const match = latest?.code?.match(/WO-(\d+)/);
        return match ? Number(match[1]) + 1 : 1;
      })();

      const code = `WO-${pad(nextNumber)}`;
      return tx.workOrder.create({ data: { ...data, code } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function woUpdate(id: string, patch: WoUpdateInput) {
  return prisma.workOrder.update({ where: { id }, data: patch });
}

export async function woGet(id: string) {
  return prisma.workOrder.findUnique({ where: { id }});
}

export async function woList(tenantId: string, q?: string, status?: string) {
  return prisma.workOrder.findMany({
    where: {
      tenantId,
      AND: [
        q ? { OR: [{ title: { contains: q, mode:"insensitive" }}, { description: { contains: q, mode:"insensitive" }}] } : {},
        status ? { status: status as any } : {}
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

