import { z } from "zod";
import { InvoiceCreate, InvoicePost } from "./invoice.schema";
import * as repo from "./invoice.repo";
import { audit } from "@/server/utils/audit";

export async function create(input: unknown, actorId?: string, ip?: string) {
  const data = InvoiceCreate.parse(input);
  const inv = await repo.create(data);
  await audit(data.tenantId, actorId, "invoice.create", `invoice:${inv.number}`, { id: inv.id }, ip);
  return inv;
}

export async function list(tenantId: string, q?:string, status?:string) {
  return repo.list(tenantId, q, status);
}

export async function post(tenantId:string, id: string, input: unknown, actorId?:string, ip?:string) {
  const data = InvoicePost.parse(input);
  const status = data.action === "POST" ? "POSTED" : "VOID";
  const inv = await repo.setStatus(id, tenantId, status);
  await audit(tenantId, actorId, "invoice.updateStatus", `invoice:${inv.number}`, { status }, ip);
  return inv;
}

