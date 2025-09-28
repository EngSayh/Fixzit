import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { SupportTicket } from "@/src/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const createSchema = z.object({
  subject: z.string().min(4),
  module: z.enum(["FM","Souq","Aqar","Account","Billing","Other"]),
  type: z.enum(["Bug","Feature","Complaint","Billing","Access","Other"]),
  priority: z.enum(["Low","Medium","High","Urgent"]).default("Medium"),
  category: z.enum(["Technical","Feature Request","Billing","Account","General","Bug Report"]).default("General"),
  subCategory: z.enum(["Bug Report","Performance Issue","UI Error","API Error","Database Error","New Feature","Enhancement","Integration","Customization","Mobile App","Invoice Issue","Payment Error","Subscription","Refund","Pricing","Login Issue","Password Reset","Profile Update","Permissions","Access Denied","Documentation","Training","Support","Feedback","Other","Critical Bug","Minor Bug","Cosmetic Issue","Data Error","Security Issue"]).default("Other"),
  text: z.string().min(5),
  requester: z.object({ name:z.string().min(2), email:z.string().email(), phone:z.string().optional() }).optional()
});

export async function POST(req: NextRequest){
<<<<<<< HEAD
  try {
    await db;
    const user = await getSessionUser(req).catch(()=>null);
    const body = createSchema.parse(await req.json());
=======
  await connectDb();
  const user = await getSessionUser(req).catch(()=>null);
  const body = createSchema.parse(await req.json());
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b

    // Generate cryptographically secure ticket code
    const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const code = `SUP-${new Date().getFullYear()}-${uuid}`;
    
    const ticket = await SupportTicket.create({
      tenantId: user?.tenantId,
      code,
      subject: body.subject,
      module: body.module,
      type: body.type,
      priority: body.priority,
      category: body.category,
      subCategory: body.subCategory,
      status: "New",
      createdByUserId: user?.id,
      requester: user ? undefined : body.requester,
      messages: [{ byUserId: user?.id, byRole: user ? "USER" : "GUEST", text: body.text, at: new Date() }]
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Support ticket creation failed:', error);
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}

// Admin list with filters
export async function GET(req: NextRequest){
<<<<<<< HEAD
  try {
    await db;
    const user = await getSessionUser(req).catch(()=>null);
    if (!user || !["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role)){
      return NextResponse.json({ error: "Forbidden"},{ status: 403 });
    }
    
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status") || undefined;
    const moduleKey = sp.get("module") || undefined;
    const type = sp.get("type") || undefined;
    const priority = sp.get("priority") || undefined;
    const page = Math.max(1, Number(sp.get("page")||1));
    const limit = Math.min(100, Number(sp.get("limit")||20));
    
    // Build query with proper tenant isolation
    const match:any = {
      // Ensure tenant isolation - users can only see tickets from their tenant
      tenantId: user.tenantId
    };
    if (status) match.status = status;
    if (moduleKey) match.module = moduleKey;
    if (type) match.type = type;
    if (priority) match.priority = priority;
=======
  await connectDb();
  const user = await getSessionUser(req).catch(()=>null);
  if (!user || !["SUPER_ADMIN","SUPPORT","CORPORATE_ADMIN"].includes(user.role)){
    return NextResponse.json({ error: "Forbidden"},{ status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") || undefined;
  const moduleKey = sp.get("module") || undefined;
  const type = sp.get("type") || undefined;
  const priority = sp.get("priority") || undefined;
  const page = Math.max(1, Number(sp.get("page")||1));
  const limit = Math.min(100, Number(sp.get("limit")||20));
  const match:any = {};
  if (status) match.status = status;
  if (moduleKey) match.module = moduleKey;
  if (type) match.type = type;
  if (priority) match.priority = priority;
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b

    const [items,total] = await Promise.all([
      (SupportTicket as any).find(match).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      (SupportTicket as any).countDocuments(match)
    ]);
    return NextResponse.json({ items, page, limit, total });
  } catch (error) {
    console.error('Support tickets query failed:', error);
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 });
  }
}
