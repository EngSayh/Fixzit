import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }){
  const user = await getSessionUser(req);
  if (!["SUPER_ADMIN"].includes(user.role)){
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = patchSchema.parse(await req.json());
  const db = await getDatabase();
  const coll = db.collection('helparticles');

  const filter = (() => {
    try { return { _id: new ObjectId(params.id) }; } catch { return { slug: params.id }; }
  })();

  const update = {
    $set: {
      ...data,
      updatedBy: user.id,
      updatedAt: new Date()
    }
  };

  const res = await coll.findOneAndUpdate(filter as any, update, { returnDocument: 'after' } as any);
  const article = (res as any)?.value || null;
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}
