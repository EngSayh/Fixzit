import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";

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
    const inv = await svc.post(tenantId, params.id, body, actorId, ip);
    return NextResponse.json({ data: inv });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status:400 });
  }
}

