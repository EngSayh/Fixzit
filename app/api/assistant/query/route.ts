import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { HelpArticle } from "@/server/models/HelpArticle";
import { WorkOrder } from "@/server/models/WorkOrder";
import { getSessionUser, type SessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const BodySchema = z.object({
  question: z.string().min(1)});

type Citation = { title: string; slug: string };

function parseNewTicket(question: string) {
  const isSlash = question.trim().toLowerCase().startsWith("/new-ticket");
  const isNatural = /\b(create|open)\b.*\b(work\s*order|ticket)\b/i.test(question);
  if (!isSlash && !isNatural) return null;

  const get = (key: string) => {
    const m = question.match(new RegExp(`${key}:("([^"]+)"|([^\s]+))`, "i"));
    if (!m) return undefined;
    return (m[2] || m[3])?.trim();
  };

  const title = get("title") || question.replace(/^\s*\/new-ticket\s*/i, "").trim() || "General request";
  const description = get("desc") || get("description");
  const priority = (get("priority") || "MEDIUM").toUpperCase();
  const propertyId = get("propertyId");
  const unitId = get("unitId");
  return { title, description, priority, propertyId, unitId } as const;
}

function isMyTickets(question: string) {
  return question.trim().toLowerCase().startsWith("/my-tickets") || /\b(my|list)\b.*\b(tickets|work\s*orders)\b/i.test(question);
}

/**
 * @openapi
 * /api/assistant/query:
 *   get:
 *     summary: assistant/query operations
 *     tags: [assistant]
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase(); // ensure DB/init (real or mock)
  } catch {}

  let user: SessionUser | null = null;
  try {
    user = await getSessionUser(req);
  } catch {
    user = null; // allow public help queries without actions
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return createSecureResponse({ error: "Invalid request" }, 400, req);
  }

  const q = body.question.trim();

  // Tools: create new ticket
  const createArgs = parseNewTicket(q);
  if (createArgs) {
    if (!user) {
      return NextResponse.json({ answer: "Please sign in to create a work order.", citations: [] });
    }
    try {
      const seq = Math.floor((Date.now() / 1000) % 100000);
      const code = `WO-${new Date().getFullYear()}-${seq}`;
      const wo = await WorkOrder.create({
        tenantId: user.tenantId || user.orgId,
        code,
        title: createArgs.title,
        description: createArgs.description,
        priority: ["LOW","MEDIUM","HIGH","URGENT"].includes(createArgs.priority) ? createArgs.priority : "MEDIUM",
        propertyId: createArgs.propertyId,
        unitId: createArgs.unitId,
        requester: { type: "TENANT", id: user.id },
        status: "SUBMITTED",
        statusHistory: [{ from: "DRAFT", to: "SUBMITTED", byUserId: user.id, at: new Date() }],
        createdBy: user.id});
      const answer = `Created work order ${wo.code} – "${wo.title}" with priority ${wo.priority}.`;
      return NextResponse.json({ answer, citations: [] as Citation[] });
    } catch (e: any) {
      return NextResponse.json({ answer: `Could not create work order: ${e.message || "unknown error"}`, citations: [] as Citation[] });
    }
  }

  // Tools: list my tickets
  if (isMyTickets(q)) {
    if (!user) {
      return NextResponse.json({ answer: "Please sign in to view your tickets.", citations: [] });
    }
    const items = await WorkOrder.find({ tenantId: user.tenantId || user.orgId, createdBy: user.id })
      .sort?.({ createdAt: -1 })
      .limit?.(5) || [];
    const lines = (Array.isArray(items) ? items : []).map((it: unknown) => `• ${it.code}: ${it.title} – ${it.status}`);
    const answer = lines.length ? `Your recent work orders:\n${lines.join("\n")}` : "You have no work orders yet.";
    return NextResponse.json({ answer, citations: [] as Citation[] });
  }

  // Knowledge retrieval from Help Articles (tenant-agnostic help)
  let docs: unknown[] = [];
  try {
    docs = await HelpArticle.find({ status: "PUBLISHED", $text: { $search: q } })
      .sort?.({ updatedAt: -1 })
      .limit?.(5) || [];
  } catch {
    // Fallback: simple title match in mock mode
    try {
      docs = await HelpArticle.find({ status: "PUBLISHED" })
        .sort?.({ updatedAt: -1 })
        .limit?.(20) || [];
      const s = q.toLowerCase();
      docs = (docs as unknown[]).filter(d => (d.title || "").toLowerCase().includes(s) || (d.content || "").toLowerCase().includes(s)).slice(0, 5);
    } catch {}
  }

  const citations: Citation[] = (docs || []).map((d: unknown) => ({ title: d.title, slug: d.slug })).slice(0, 5);
  let answer = "";
  if (docs?.length) {
    const d0 = docs[0];
    const firstPara = (d0.content || "").split(/\n\n+/)[0]?.trim() || d0.title;
    answer = `${firstPara}\n\nI included related help articles below.`;
  } else {
    answer = "I could not find a specific article for that yet. Try rephrasing or ask about work orders, properties, invoices, or approvals.";
  }

  return NextResponse.json({ answer, citations });
}



