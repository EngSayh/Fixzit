import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { CmsPage } from "@/src/server/models/CmsPage";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

<<<<<<< HEAD
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await db;
    
    // For public pages, we might allow access without authentication for published content
    // But we should still implement tenant scoping for security
    const user = await getSessionUser(req).catch(() => null);
    
    const query: any = { slug: params.slug };
    
    // If no user context, only show published pages
    if (!user) {
      query.status = 'PUBLISHED';
    } else {
      // If user is authenticated, scope by tenant
      query.tenantId = user.tenantId;
    }
    
    const page = await (CmsPage as any).findOne(query);
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('CMS page fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
=======
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  await connectDb();
  const page = await (CmsPage as any).findOne({ slug: params.slug });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
}

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
<<<<<<< HEAD
  try {
    await db;
    const user = await getSessionUser(req).catch(()=>null);
    if (!user || !["SUPER_ADMIN","CORPORATE_ADMIN","ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const data = patchSchema.parse(await req.json());
    
    // Ensure tenant scoping for updates
    const page = await (CmsPage as any).findOneAndUpdate(
      { slug: params.slug, tenantId: user.tenantId }, 
      { 
        $set: { 
          ...data, 
          tenantId: user.tenantId, 
          updatedBy: user.id, 
          updatedAt: new Date() 
        } 
      }, 
      { new: true, upsert: true }
    );
    
    return NextResponse.json(page);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('CMS page update failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
=======
  await connectDb();
  const user = await getSessionUser(req).catch(()=>null);
  if (!user || !["SUPER_ADMIN","CORPORATE_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
  }
}
