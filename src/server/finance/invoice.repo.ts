import { prisma } from "@/server/db/client";
import type { z } from "zod";
import { InvoiceCreate } from "./invoice.schema";

function pad(num:number,size=6){return String(num).padStart(size,"0");}

export async function create(input: z.infer<typeof InvoiceCreate>) {
  const count = await prisma.invoice.count({ where: { tenantId: input.tenantId }});
  const number = `INV-${pad(count+1)}`;
  const totals = computeTotals(input.lines);
  return prisma.invoice.create({
    data: {
      tenantId: input.tenantId,
      number,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      total: totals.total,
      vatAmount: totals.vat,
      lines: {
        create: input.lines.map(l => ({
          sku: l.sku ?? null, description: l.description,
          qty: l.qty, unitPrice: l.unitPrice, vatRate: l.vatRate,
          total: (l.qty * l.unitPrice) * (1 + l.vatRate/100)
        }))
      }
    },
    include: { lines: true }
  });
}

export async function list(tenantId: string, q?:string, status?:string, _type?:string) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      AND: [
        q ? { OR: [{ number: { contains: q, mode:"insensitive" }}, { customerRef: { contains: q, mode:"insensitive" }}]} : {},
        status ? { status: status as any } : {}
      ]
    },
    orderBy: { createdAt:"desc" },
    include: { lines:true }
  });
}

export async function setStatus(id: string, tenantId: string, status: "POSTED"|"VOID") {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.tenantId !== tenantId) throw new Error("Not authorized");
  await prisma.invoice.update({ where: { id }, data: { status } });
  return prisma.invoice.findFirstOrThrow({ where: { id, tenantId }, include: { lines: true } });
}

function computeTotals(lines: Array<{ qty:number; unitPrice:number; vatRate:number }>) {
  let sub = 0, vat = 0;
  for (const l of lines) {
    const lineSub = l.qty * l.unitPrice;
    sub += lineSub;
    vat += lineSub * (l.vatRate/100);
  }
  return { sub, vat, total: sub + vat };
}

