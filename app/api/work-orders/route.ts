import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { connectMongoDB } from "@/lib/database";
import { getSessionUser, requireAbility } from "@/lib/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  requester: z.object({
    type: z.enum(["TENANT","OWNER","STAFF"]).default("TENANT"),
    id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }).optional()
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    let items: any[] = [];
    let total = 0;

    try {
      // Try PostgreSQL first
      const where: any = { tenantId: user.tenantId };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (q) {
        where.OR = [
          { title: { contains: q } },
          { description: { contains: q } }
        ];
      }

      items = await prisma.workOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      total = await prisma.workOrder.count({ where });
    } catch (error) {
      console.log('PostgreSQL not available, trying MongoDB...');
      // Fallback to MongoDB
      const mongoDb = await connectMongoDB();
      const workOrdersCollection = mongoDb.collection('workOrders');
      
      const match: any = { tenantId: user.tenantId };
      if (status) match.status = status;
      if (priority) match.priority = priority;
      if (q) match.$text = { $search: q };

      items = await workOrdersCollection
        .find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      total = await workOrdersCollection.countDocuments(match);
    }

    return NextResponse.json({ items, page, limit, total });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAbility("CREATE")(req);
    if (user instanceof NextResponse) return user as any;

    const body = await req.json();
    const data = createSchema.parse(body);

    // Generate code per-tenant sequence (simplified)
    const seq = Math.floor((Date.now() / 1000) % 100000);
    const code = `WO-${new Date().getFullYear()}-${seq}`;

    let workOrder;

    try {
      // Try PostgreSQL first
      workOrder = await prisma.workOrder.create({
        data: {
          tenantId: user.tenantId,
          code,
          title: data.title,
          description: data.description || '',
          priority: data.priority as any,
          propertyId: data.propertyId,
          requesterId: user.id,
          status: 'NEW' as any,
          slaHours: 72
        }
      });
    } catch (error) {
      console.log('PostgreSQL not available, trying MongoDB...');
      // Fallback to MongoDB
      const mongoDb = await connectMongoDB();
      const workOrdersCollection = mongoDb.collection('workOrders');
      
      workOrder = await workOrdersCollection.insertOne({
        tenantId: user.tenantId,
        code,
        title: data.title,
        description: data.description || '',
        priority: data.priority,
        propertyId: data.propertyId,
        requesterId: user.id,
        status: 'NEW',
        slaHours: 72,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json(
      { error: 'Failed to create work order' },
      { status: 500 }
    );
  }
}