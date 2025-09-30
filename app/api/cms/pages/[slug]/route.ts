import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { CmsPage } from "@/src/server/models/CmsPage";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  await connectToDatabase();
  const page = await (CmsPage as any).findOne({ slug: params.slug });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  await connectToDatabase();
  const user = await getSessionUser(req).catch(()=>null);
  if (!user || !["SUPER_ADMIN","CORPORATE_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
