import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/work-orders/wo.service";

function ctx(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id") || "";
  const actorId = req.headers.get("x-user-id") || undefined;
  return { tenantId, actorId, ip: req.ip ?? "" };
}

export async function PATCH(req: NextRequest, { params }: { params:{ id:string }}) {
  const { tenantId, actorId, ip } = ctx(req);
  if (!tenantId) return NextResponse.json({ error:"Missing tenant" },{ status: 400 });
  const body = await req.json();
  try {
    const wo = await svc.update(params.id, body, tenantId, actorId, ip);
    return NextResponse.json({ data: wo });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status:400 });
  }
}

