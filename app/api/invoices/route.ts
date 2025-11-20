import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Invoice } from "@/server/models/Invoice";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { generateZATCAQR } from "@/lib/zatca";
import { nanoid } from "nanoid";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

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

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     summary: invoices operations
 *     tags: [invoices]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getSessionUser(req);
    
    // Rate limiting AFTER authentication
    const clientIp = getClientIP(req);
    const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }

    const data = createInvoiceSchema.parse(await req.json());

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    interface TaxSummary {
      type: string;
      rate: number;
      amount: number;
      category?: string;
    }
    const taxes: TaxSummary[] = [];

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

    // Generate atomic invoice number per tenant/year
    const year = new Date().getFullYear();
    const result = await Invoice.db.collection("invoice_counters").findOneAndUpdate(
      { tenantId: user.orgId, year },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    const sequence = (result as { sequence?: number } | null)?.sequence ?? 1;
    const number = `INV-${year}-${String(sequence).padStart(5, '0')}`;

    // Generate ZATCA QR code
    const qrCode = await generateZATCAQR({
      sellerName: data.issuer.name,
      vatNumber: data.issuer.taxId,
      timestamp: new Date(data.issueDate).toISOString(),
      total: total.toString(),
      vatAmount: totalTax.toString()
    });

    const invoice = (await Invoice.create({
      tenantId: user.orgId,
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
    }));

    return createSecureResponse(invoice, 201, req);
  } catch (error: unknown) {
    const correlationId = crypto.randomUUID();
    logger.error('[POST /api/invoices] Error creating invoice:', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return createSecureResponse({ 
        error: 'Validation failed',
        details: error.issues,
        correlationId
      }, 422, req);
    }
    
    return createSecureResponse({ 
      error: 'Failed to create invoice',
      correlationId
    }, 500, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getSessionUser(req);
    
    // Rate limiting AFTER authentication
    const clientIp = getClientIP(req);
    const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const match: Record<string, unknown> = { tenantId: user.orgId };

    if (status) match.status = status;
    if (type) match.type = type;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { number: { $regex: escapedSearch, $options: 'i' } },
        { 'recipient.name': { $regex: escapedSearch, $options: 'i' } }
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
  } catch (error: unknown) {
    const correlationId = crypto.randomUUID();
    logger.error('[GET /api/invoices] Error fetching invoices:', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return createSecureResponse({ 
      error: 'Failed to fetch invoices',
      correlationId
    }, 500, req);
  }
}


