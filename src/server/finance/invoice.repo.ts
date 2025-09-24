import type { z } from "zod";
import { InvoiceCreate } from "./invoice.schema";
import { Invoice } from "@/src/server/models/Invoice";

function pad(num:number,size=6){return String(num).padStart(size,"0");}

export async function create(input: z.infer<typeof InvoiceCreate>) {
  const count = await (Invoice as any).countDocuments({ tenantId: input.tenantId });
  const number = `INV-${pad(count+1)}`;
  const totals = computeTotals(input.lines);
  return (Invoice as any).create({
    tenantId: input.tenantId,
    number,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    subtotal: totals.sub,
    total: totals.total,
    taxes: [{ type: 'VAT', rate: input.lines?.[0]?.vatRate ?? 15, amount: totals.vat }],
    items: input.lines?.map(l => ({
      description: l.description,
      quantity: l.qty,
      unitPrice: l.unitPrice,
      tax: { type: 'VAT', rate: l.vatRate, amount: l.qty * l.unitPrice * (l.vatRate / 100) },
      total: (l.qty * l.unitPrice) * (1 + l.vatRate/100)
    }))
  });
}

export async function list(tenantId: string, q?:string, status?:string) {
  const filter: any = { tenantId };
  if (status) filter.status = status;
  if (q) filter.$or = [{ number: { $regex: q, $options: 'i' } }, { 'recipient.name': { $regex: q, $options: 'i' } }];
  return (Invoice as any).find(filter).sort({ createdAt: -1 });
}

export async function setStatus(id: string, status: "POSTED"|"VOID") {
  return (Invoice as any).findByIdAndUpdate(id, { $set: { status } }, { new: true });
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

