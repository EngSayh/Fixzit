import { prisma } from "@/server/db/client";
import type { WoCreateInput, WoUpdateInput } from "./wo.schema";

function pad(num: number, size = 6) { return String(num).padStart(size,"0"); }

export async function woCreate(data: WoCreateInput) {
  const count = await prisma.workOrder.count({ where: { tenantId: data.tenantId }});
  const code = `WO-${pad(count+1)}`;
  return prisma.workOrder.create({ data: { ...data, code }});
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

