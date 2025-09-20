import { NextRequest, NextResponse } from 'next/server';
import { backendPrisma as prisma } from '@/lib/backend-prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

async function verifyAuth(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/finance/invoices - List invoices
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const tenantId = searchParams.get('tenantId');
    const propertyId = searchParams.get('propertyId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    // Build filter conditions
    const where: any = { orgId: auth.orgId };
    
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.invoice.count({ where });

    // Fetch invoices with relations
    const invoices = await prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true
          }
        },
        payments: {
          where: {
            status: 'received'
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Transform invoices
    const transformedInvoices = invoices.map(invoice => {
      const paidAmount = invoice.payments.reduce((sum, payment) => 
        sum + payment.amount.toNumber(), 0
      );
      const remainingAmount = invoice.totalAmount.toNumber() - paidAmount;
      const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        status: isOverdue && invoice.status !== 'paid' ? 'overdue' : invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        description: invoice.description,
        amount: invoice.amount.toNumber(),
        taxAmount: invoice.taxAmount.toNumber(),
        discountAmount: invoice.discountAmount.toNumber(),
        totalAmount: invoice.totalAmount.toNumber(),
        paidAmount,
        remainingAmount,
        currency: invoice.currency,
        tenant: invoice.tenant ? {
          id: invoice.tenant.id,
          name: `${invoice.tenant.firstName} ${invoice.tenant.lastName}`,
          email: invoice.tenant.email,
          phone: invoice.tenant.phone
        } : null,
        property: invoice.property ? {
          id: invoice.property.id,
          name: invoice.property.name,
          address: invoice.property.address
        } : null,
        unit: invoice.unit ? {
          id: invoice.unit.id,
          unitNumber: invoice.unit.unitNumber
        } : null,
        createdBy: `${invoice.creator.firstName} ${invoice.creator.lastName}`,
        createdAt: invoice.createdAt
      };
    });

    return NextResponse.json({
      data: transformedInvoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/finance/invoices - Create invoice
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const {
      tenantId,
      propertyId,
      unitId,
      type,
      issueDate,
      dueDate,
      description,
      amount,
      taxRate = 0,
      discountAmount = 0,
      notes,
      terms,
      lineItems,
      isRecurring = false,
      recurringPattern
    } = data;

    // Validate required fields
    if (!description || !amount || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: 'Description, amount, issue date, and due date are required' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const invoiceNumber = `INV-${timestamp}-${random}`;

    // Calculate amounts
    const baseAmount = parseFloat(amount);
    const taxAmount = (baseAmount * (taxRate / 100));
    const totalAmount = baseAmount + taxAmount - (discountAmount || 0);

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        tenantId,
        propertyId,
        unitId,
        type: type || 'rent',
        status: 'draft',
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        description,
        amount: baseAmount,
        taxAmount,
        discountAmount: discountAmount || 0,
        totalAmount,
        notes,
        terms,
        isRecurring,
        recurringPattern: recurringPattern ? JSON.stringify(recurringPattern) : null,
        orgId: auth.orgId,
        createdBy: auth.userId,
        // Create line items if provided
        ...(lineItems && lineItems.length > 0 ? {
          lineItems: {
            create: lineItems.map((item: any, index: number) => ({
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              amount: item.amount || (item.quantity * item.unitPrice),
              taxRate: item.taxRate || 0,
              taxAmount: item.taxAmount || 0,
              sortOrder: index
            }))
          }
        } : {})
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        },
        lineItems: true
      }
    });

    // Create notification for tenant if assigned
    if (tenantId) {
      await prisma.notification.create({
        data: {
          type: 'invoice_created',
          title: 'New Invoice',
          message: `You have a new invoice: ${invoiceNumber}`,
          userId: auth.userId, // This should be the tenant's user ID in a real scenario
          entityType: 'invoice',
          entityId: invoice.id,
          orgId: auth.orgId,
          createdBy: auth.userId
        }
      }).catch(err => {
        console.error('Failed to create notification:', err);
      });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}