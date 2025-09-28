import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { HelpArticle } from "@/src/server/models/HelpArticle";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }){
  await connectDb();
  const user = await getSessionUser(req);
  if (!["SUPER_ADMIN"].includes(user.role)){
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = patchSchema.parse(await req.json());
  const article = await (HelpArticle as any).findByIdAndUpdate(params.id, {
    $set: {
      ...data,
      updatedBy: user.id,
      updatedAt: new Date()
    }
  }, { new: true });
  
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}
