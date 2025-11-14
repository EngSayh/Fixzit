import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import {requireAbility } from "@/server/middleware/withAuthRbac";

// Define type for exported work order fields
interface WorkOrderExportDoc {
  code?: string;
  title?: string;
  status?: string;
  priority?: string;
  propertyId?: string;
  assigneeUserId?: string;
  createdAt?: Date;
  dueAt?: Date;
}

/**
 * @openapi
 * /api/work-orders/export:
 *   get:
 *     summary: work-orders/export operations
 *     tags: [work-orders]
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
export async function GET(req:NextRequest): Promise<NextResponse> {
  const user = await requireAbility("EXPORT")(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();
  
  // Use .lean() to get plain JavaScript objects instead of Mongoose documents
  const docs = (await WorkOrder.find({tenantId:user.orgId, deletedAt:{$exists:false}})
    .limit(2000)
    .lean<WorkOrderExportDoc[]>());
  
  const header = ["code","title","status","priority","propertyId","assigneeUserId","createdAt","dueAt"];
  const lines = [header.join(",")].concat(docs.map((d: WorkOrderExportDoc) =>[
    d.code || "", 
    JSON.stringify(d.title || ""), 
    d.status || "", 
    d.priority || "", 
    d.propertyId || "", 
    d.assigneeUserId || "", 
    d.createdAt?.toISOString() || "", 
    d.dueAt?.toISOString() || ""
  ].join(",")));
  
  const csv = lines.join("\n");
  return new NextResponse(csv, { 
    status: 200, 
    headers: { 
      "content-type": "text/csv; charset=utf-8", 
      "content-disposition": "attachment; filename=work-orders.csv" 
    }
  });
}


