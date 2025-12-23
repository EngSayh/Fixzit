import { InvoiceCreate, InvoicePost } from "./invoice.schema";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Invoice } from "@/server/models/Invoice";

// Mock implementation retained for optional mock mode
class MockInvoiceService {
  private invoices: Array<Record<string, unknown>> = [];
  private nextId = 1;

  constructor() {
    this.invoices = [];
  }

  async create(input: Record<string, unknown>) {
    const invoice = {
      id: this.nextId.toString(),
      orgId: input.orgId, // AUDIT-2025-11-30: Changed from tenantId to orgId
      number: `INV-${String(this.nextId).padStart(6, "0")}`,
      ...input,
      status: "DRAFT",
    };
    this.invoices.push(invoice);
    this.nextId++;
    return invoice;
  }

  async list(orgId: string, q?: string, status?: string) {
    let results = this.invoices.filter((inv) => inv.orgId === orgId); // AUDIT-2025-11-30: Changed from tenantId

    if (status) {
      results = results.filter((inv) => inv.status === status);
    }

    if (q) {
      const query = q.toLowerCase();
      results = results.filter((inv) => {
        const number = String(inv.number || "").toLowerCase();
        const lines = inv.lines as Array<{ description?: string }> | undefined;
        return (
          number.includes(query) ||
          lines?.some((line) =>
            String(line.description || "")
              .toLowerCase()
              .includes(query),
          )
        );
      });
    }

    return results;
  }

  async setStatus(id: string, status: string) {
    const invoice = this.invoices.find((inv) => inv.id === id);
    if (invoice) {
      invoice.status = status;
    }
    return invoice;
  }
}

const _mockService = new MockInvoiceService();

export async function create(input: unknown, actorId?: string, _ip?: string) {
  const data = InvoiceCreate.parse(input);

  await connectToDatabase();

  const number = await nextInvoiceNumber(data.orgId); // AUDIT-2025-11-30: Changed from tenantId
  const totals = computeTotals(data.lines);

  const invoice = await Invoice.create({
    orgId: data.orgId, // AUDIT-2025-11-30: Changed from tenantId to match model
    number,
    type: "SERVICE",
    status: "DRAFT",
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    customerRef: data.customerRef,
    currency: data.currency,
    items: data.lines.map((line) => ({
      description: line.description,
      quantity: line.qty,
      unitPrice: line.unitPrice,
      discount: 0,
      tax: {
        type: "VAT",
        rate: line.vatRate,
        amount: round(line.qty * line.unitPrice * (line.vatRate / 100)),
      },
      total: round(line.qty * line.unitPrice * (1 + line.vatRate / 100)),
      category: "SERVICE",
    })),
    subtotal: totals.subtotal,
    taxes: totals.taxLines,
    total: totals.total,
    createdBy: actorId ?? "system",
  });

  return invoice.toObject();
}

export type InvoiceListFilters = {
  orgId: string;
  q?: string;
  status?: string;
  amountMin?: number;
  amountMax?: number;
  issueFrom?: Date;
  issueTo?: Date;
  dueFrom?: Date;
  dueTo?: Date;
};

export async function list(filtersInput: InvoiceListFilters) {
  await connectToDatabase();

  const { orgId, q, status, amountMin, amountMax, issueFrom, issueTo, dueFrom, dueTo } = filtersInput;

  const filters: Record<string, unknown> = { orgId }; // AUDIT-2025-11-30: Changed from tenantId

  if (status) {
    filters.status = status;
  }

  if (q) {
    // SECURITY: Escape regex special characters to prevent ReDoS
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQ, "i");
    filters.$or = [
      { number: regex },
      { customerRef: regex },
      { "items.description": regex },
    ];
  }

  if (amountMin !== undefined || amountMax !== undefined) {
    const range: Record<string, number> = {};
    if (typeof amountMin === "number") range.$gte = amountMin;
    if (typeof amountMax === "number") range.$lte = amountMax;
    filters.total = range;
  }

  if (issueFrom || issueTo) {
    const issueDateRange: Record<string, Date> = {};
    if (issueFrom) issueDateRange.$gte = issueFrom;
    if (issueTo) issueDateRange.$lte = issueTo;
    filters.issueDate = issueDateRange;
  }

  if (dueFrom || dueTo) {
    const dueDateRange: Record<string, Date> = {};
    if (dueFrom) dueDateRange.$gte = dueFrom;
    if (dueTo) dueDateRange.$lte = dueTo;
    filters.dueDate = dueDateRange;
  }

  const invoices = await Invoice.find(filters)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return invoices;
}

export async function post(
  orgId: string, // AUDIT-2025-11-30: Changed from tenantId
  id: string,
  input: unknown,
  actorId?: string,
  ip?: string,
) {
  const data = InvoicePost.parse(input);

  await connectToDatabase();

  const status = data.action === "POST" ? "SENT" : "CANCELLED";
  const historyEntry = {
    action: status === "SENT" ? "POSTED" : "VOIDED",
    performedBy: actorId ?? "system",
    performedAt: new Date(),
    details:
      status === "SENT" ? "Invoice posted to customer" : "Invoice voided",
    ipAddress: ip,
  };

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, orgId }, // AUDIT-2025-11-30: Changed from tenantId
    {
      status,
      updatedBy: actorId ?? "system",
      $push: { history: historyEntry },
    },
    { new: true },
  ).lean();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return invoice;
}

async function nextInvoiceNumber(orgId: string) {
  const latest = (await Invoice.findOne({ orgId }) // AUDIT-2025-11-30: Changed from tenantId
    .sort({ createdAt: -1 })
    .select("number")
    .lean()) as { number: string } | null;

  const latestNumber = Array.isArray(latest)
    ? latest[0]?.number
    : latest?.number;
  const match = latestNumber?.match(/INV-(\d+)/);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `INV-${String(next).padStart(6, "0")}`;
}

function computeTotals(
  lines: Array<{ qty: number; unitPrice: number; vatRate: number }>,
) {
  let subtotal = 0;
  const taxMap = new Map<number, number>();

  for (const line of lines) {
    const lineSubtotal = line.qty * line.unitPrice;
    const lineTax = lineSubtotal * (line.vatRate / 100);
    subtotal += lineSubtotal;
    taxMap.set(line.vatRate, (taxMap.get(line.vatRate) ?? 0) + lineTax);
  }

  const taxTotal = Array.from(taxMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const taxLines = Array.from(taxMap.entries()).map(([rate, amount]) => ({
    type: "VAT",
    rate,
    amount: round(amount),
    category: "STANDARD",
  }));

  return {
    subtotal: round(subtotal),
    taxTotal: round(taxTotal),
    total: round(subtotal + taxTotal),
    taxLines,
  };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
