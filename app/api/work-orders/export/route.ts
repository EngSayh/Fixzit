import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { getSessionUser, requireAbility } from "@/src/server/middleware/withAuthRbac";

export async function GET(req:NextRequest){
  const user = await requireAbility("EXPORT")(req);
  if (user instanceof NextResponse) return user as any;
  await connectDb();
  const docs = await (WorkOrder as any).find({tenantId:user.tenantId, deletedAt:{$exists:false}}).limit(2000);
  const header = ["code","title","status","priority","propertyId","assigneeUserId","createdAt","dueAt"];
  const lines = [header.join(",")].concat(docs.map((d: any)=>[
    d.code, JSON.stringify(d.title), d.status, d.priority, d.propertyId||"", d.assigneeUserId||"", d.createdAt?.toISOString()||"", d.dueAt?.toISOString()||""
  ].join(",")));
  const csv = lines.join("\n");
  return new NextResponse(csv, { status:200, headers: { "content-type":"text/csv; charset=utf-8", "content-disposition":"attachment; filename=work-orders.csv" }});
}
