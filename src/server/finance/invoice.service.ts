import { z } from "zod";
import { InvoiceCreate, InvoicePost } from "./invoice.schema";
import * as repo from "./invoice.repo";
import { withIdempotency } from "@/server/security/idempotency";
import { audit } from "@/server/utils/audit";

export async function create(input: unknown, actorId?: string, ip?: string) {
  const data = InvoiceCreate.parse(input);
  const inv = await withIdempotency(`inv:create:${data.tenantId}:${data.issueDate.toISOString()}:${data.dueDate.toISOString()}`, () => repo.create(data));
  await audit(data.tenantId, actorId, "invoice.create", `invoice:${inv.number}`, { inv }, ip);
  return inv;
}

export async function list(tenantId: string, q?:string, status?:string) {
  return repo.list(tenantId, q, status);
}

export async function post(tenantId:string, id: string, input: unknown, actorId?:string, ip?:string) {
  const data = InvoicePost.parse(input);
  const inv = await repo.setStatus(id, data.action === "POST" ? "POSTED" : "VOID");
  await audit(tenantId, actorId, data.action==="POST"?"invoice.post":"invoice.void", `invoice:${inv.number}`, {}, ip);
  return inv;
}

