import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/server/work-orders/wo.service";
import { rateLimit } from "@/server/security/rateLimit";

function ctx(req: NextRequest) {
  // In real app, read from auth/session/JWT:
  const tenantId = req.headers.get("x-tenant-id") || ""; // pass from client
  const actorId = req.headers.get("x-user-id") || undefined;
  return { tenantId, actorId, ip: req.ip ?? "" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { tenantId } = ctx(req);
  if (!tenantId) return NextResponse.json({ error:"Missing tenant" },{ status: 400 });

  const q = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const data = await svc.list(tenantId, q, status);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const key = `wo:${req.headers.get("x-user-id")}:${req.headers.get("x-tenant-id")}`;
  const rl = rateLimit(key, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error:"Rate limit" }, { status:429 });

  const { tenantId, actorId, ip } = ctx(req);
  if (!tenantId) return NextResponse.json({ error:"Missing tenant" },{ status: 400 });

  const body = await req.json();
  try {
    const wo = await svc.create({ ...body, tenantId }, actorId, ip);
    return NextResponse.json({ data: wo }, { status:201 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status:400 });
  }
}

