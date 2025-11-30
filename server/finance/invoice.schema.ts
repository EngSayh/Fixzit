import { z } from "zod";

export const InvoiceLine = z.object({
  sku: z.string().optional(),
  description: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().min(0).max(100).default(15),
});

export const InvoiceCreate = z.object({
  orgId: z.string().cuid(), // AUDIT-2025-11-30: Changed from tenantId to orgId for model alignment
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  customerRef: z.string().optional(),
  currency: z.string().default("SAR"),
  lines: z.array(InvoiceLine).min(1),
});

export const InvoicePost = z.object({
  action: z.enum(["POST", "VOID"]).default("POST"),
});
