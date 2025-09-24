import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/finance/invoice.service";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { rateLimit } from "@/server/security/rateLimit";

function ctx(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id") || "";
  const actorId = req.headers.get("x-user-id") || undefined;
  return { tenantId, actorId, ip: req.ip ?? "" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { tenantId } = await getSessionUser(req).catch(()=>({ tenantId: "" } as any));
  if (!tenantId) return NextResponse.json({ error:"Missing tenant" },{ status: 400 });
  const q = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const data = await svc.list(tenantId, q, status);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { tenantId, id: actorId } = await getSessionUser(req).catch(()=>({ tenantId: "", id: undefined } as any));
  const ip = req.ip ?? "";
  if (!tenantId) return NextResponse.json({ error:"Missing tenant" },{ status: 400 });

  const key = `inv:${tenantId}:${actorId}`;
  const rl = rateLimit(key, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error:"Rate limit" }, { status:429 });

  const body = await req.json();
  try {
    const data = await svc.create({ ...body, tenantId }, actorId, ip);
    return NextResponse.json({ data }, { status:201 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status:400 });
  }
}

