import { z } from "zod";
import { InvoiceCreate, InvoicePost } from "./invoice.schema";

// Mock implementation for development
class MockInvoiceService {
  private invoices: any[] = [];
  private nextId = 1;

  constructor() {
    // Initialize with sample invoices
    this.invoices = [
      {
        id: "1",
        tenantId: "t-001",
        number: "INV-2025-001",
        issueDate: "2025-01-20",
        dueDate: "2025-02-20",
        currency: "SAR",
        total: 1500,
        vatAmount: 225,
        status: "PENDING",
        lines: [
          { sku: "AC-001", description: "AC Maintenance", qty: 1, unitPrice: 1200, vatRate: 15, total: 1380 }
        ]
      },
      {
        id: "2",
        tenantId: "t-001",
        number: "INV-2025-002",
        issueDate: "2025-01-19",
        dueDate: "2025-02-19",
        currency: "SAR",
        total: 3000,
        vatAmount: 450,
        status: "POSTED",
        lines: [
          { sku: "PLUMB-001", description: "Plumbing Repair", qty: 1, unitPrice: 2500, vatRate: 15, total: 2875 }
        ]
      }
    ];
    this.nextId = 3;
  }

  async create(input: any) {
    const invoice = {
      id: this.nextId.toString(),
      tenantId: input.tenantId,
      number: `INV-${new Date().getFullYear()}-${String(this.nextId).padStart(3, '0')}`,
      ...input,
      status: "PENDING"
    };
    this.invoices.push(invoice);
    this.nextId++;
    return invoice;
  }

  async list(tenantId: string, q?: string, status?: string) {
    let results = this.invoices.filter(inv => inv.tenantId === tenantId);

    if (status) {
      results = results.filter(inv => inv.status === status);
    }

    if (q) {
      results = results.filter(inv =>
        inv.number.toLowerCase().includes(q.toLowerCase()) ||
        inv.lines.some((line: any) => line.description.toLowerCase().includes(q.toLowerCase()))
      );
    }

    return results;
  }

  async setStatus(id: string, status: string) {
    const invoice = this.invoices.find(inv => inv.id === id);
    if (invoice) {
      invoice.status = status;
    }
    return invoice;
  }
}

const mockService = new MockInvoiceService();

export async function create(input: unknown, actorId?: string, ip?: string) {
  const data = InvoiceCreate.parse(input);
  return mockService.create(data);
}

export async function list(tenantId: string, q?:string, status?:string) {
  return mockService.list(tenantId, q, status);
}

export async function post(tenantId:string, id: string, input: unknown, actorId?:string, ip?:string) {
  const data = InvoicePost.parse(input);
  return mockService.setStatus(id, data.action === "POST" ? "POSTED" : "VOID");
}

