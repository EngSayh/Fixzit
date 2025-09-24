import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { Invoice } from "@/src/server/models/Invoice";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
import { generateZATCAQR } from "@/src/lib/zatca";
import { nanoid } from "nanoid";

const createInvoiceSchema = z.object({
  type: z.enum(["SALES", "PURCHASE", "RENTAL", "SERVICE", "MAINTENANCE"]),
  issuer: z.object({
    name: z.string(),
    taxId: z.string(),
    address: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    registration: z.string().optional(),
    license: z.string().optional()
  }),
  recipient: z.object({
    name: z.string(),
    taxId: z.string().optional(),
    address: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    nationalId: z.string().optional(),
    customerId: z.string().optional()
  }),
  issueDate: z.string(),
  dueDate: z.string(),
  description: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    discount: z.number().default(0),
    tax: z.object({
      type: z.string().default("VAT"),
      rate: z.number().default(15),
      amount: z.number()
    }).optional(),
    total: z.number(),
    category: z.string().optional()
  })),
  currency: z.string().default("SAR"),
  payment: z.object({
    method: z.string().optional(),
    terms: z.string().optional(),
    instructions: z.string().optional(),
    account: z.object({
      bank: z.string().optional(),
      accountNumber: z.string().optional(),
      iban: z.string().optional(),
      swift: z.string().optional()
    }).optional()
  }).optional(),
  related: z.object({
    workOrderId: z.string().optional(),
    projectId: z.string().optional(),
    contractId: z.string().optional(),
    purchaseOrderId: z.string().optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await db;

    const data = createInvoiceSchema.parse(await req.json());

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const taxes: any[] = [];

    data.items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice - item.discount;
      subtotal += itemSubtotal;
      
      if (item.tax) {
        const taxAmount = itemSubtotal * (item.tax.rate / 100);
        totalTax += taxAmount;
        
        const existingTax = taxes.find(t => t.type === item.tax!.type && t.rate === item.tax!.rate);
        if (existingTax) {
          existingTax.amount += taxAmount;
        } else {
          taxes.push({
            type: item.tax.type,
            rate: item.tax.rate,
            amount: taxAmount,
            category: item.category
          });
        }
      }
    });

    const total = subtotal + totalTax;

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({ tenantId: user.tenantId }) + 1;
    const number = `INV-${year}-${String(count).padStart(5, '0')}`;

    // Generate ZATCA QR code
    const qrCode = await generateZATCAQR({
      sellerName: data.issuer.name,
      vatNumber: data.issuer.taxId,
      timestamp: new Date(data.issueDate),
      total: Number(total),
      vat: Number(totalTax)
    } as any);

    const invoice = await Invoice.create({
      tenantId: user.tenantId,
      number,
      ...data,
      subtotal,
      taxes,
      total,
      status: "DRAFT",
      zatca: {
        uuid: nanoid(),
        qrCode,
        status: "PENDING",
        phase: 2
      },
      history: [{
        action: "CREATED",
        performedBy: user.id,
        performedAt: new Date(),
        details: "Invoice created"
      }],
      createdBy: user.id
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await db;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

    if (status) match.status = status;
    if (type) match.type = type;
    if (search) {
      match.$or = [
        { number: { $regex: search, $options: 'i' } },
        { 'recipient.name': { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Invoice.find(match)
        .sort({ issueDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Invoice.countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}