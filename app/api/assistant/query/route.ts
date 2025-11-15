import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { HelpArticle } from "@/server/models/HelpArticle";
import { WorkOrder } from "@/server/models/WorkOrder";
import { getSessionUser, type SessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

const BodySchema = z.object({
  question: z.string().min(1)});

type Citation = { title: string; slug: string };

/**
 * WorkOrder Database Document Shape
 * Represents minimal fields needed for assistant ticket operations
 */
interface WorkOrderItem {
  code: string;      // e.g., "WO-2025-12345"
  title: string;     // User-provided work order title
  status: string;    // Current status: SUBMITTED, IN_PROGRESS, COMPLETED, etc.
}

/**
 * HelpArticle Database Document Shape
 * Represents KB articles returned from MongoDB text search
 */
interface HelpArticleDoc {
  title: string;     // Article title for display
  slug: string;      // URL-friendly identifier
  content?: string;  // Markdown/text content for snippets
}

/**
 * Parse Natural Language for New Ticket Creation
 * 
 * Supports two formats:
 * 1. Slash command: /new-ticket title:"Fix AC" desc:"Not working" priority:HIGH
 * 2. Natural language: "Create a work order for broken AC"
 * 
 * @param question - User's question string
 * @returns Parsed ticket details or null if not a ticket creation request
 * 
 * @example
 * parseNewTicket('/new-ticket title:"AC Repair"') 
 * // Returns: { title: "AC Repair", description: undefined, priority: "MEDIUM", ... }
 * 
 * parseNewTicket('open ticket for broken elevator')
 * // Returns: { title: "open ticket for broken elevator", priority: "MEDIUM", ... }
 */
function parseNewTicket(question: string) {
  const isSlash = question.trim().toLowerCase().startsWith("/new-ticket");
  const isNatural = /\b(create|open)\b.*\b(work *order|ticket)\b/i.test(question);
  if (!isSlash && !isNatural) return null;

  const get = (key: string) => {
    const m = question.match(new RegExp(`${key}:("([^"]+)"|([^ ]+))`, "i"));
    if (!m) return undefined;
    return (m[2] || m[3])?.trim();
  };

  const title = get("title") || question.replace(/^ *\/new-ticket */i, "").trim() || "General request";
  const description = get("desc") || get("description");
  const priority = (get("priority") || "MEDIUM").toUpperCase();
  const propertyId = get("propertyId");
  const unitId = get("unitId");
  return { title, description, priority, propertyId, unitId } as const;
}

/**
 * Check if Query is Requesting User's Ticket List
 * 
 * Matches patterns like:
 * - "/my-tickets" (slash command)
 * - "show my tickets"
 * - "list my work orders"
 * 
 * @param question - User's question string
 * @returns true if user wants to see their ticket list
 */
function isMyTickets(question: string) {
  return question.trim().toLowerCase().startsWith("/my-tickets") || /\b(my|list)\b.*\b(tickets|work *orders)\b/i.test(question);
}

/**
 * @openapi
 * /api/assistant/query:
 *   post:
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
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
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

  /**
   * TOOL 1: Create New Ticket/Work Order
   * 
   * When user requests ticket creation (via slash command or natural language),
   * we parse the intent, validate authentication, and create a work order in the database.
   * 
   * Flow:
   * 1. Parse ticket details from question
   * 2. Verify user authentication
   * 3. Generate unique work order code
   * 4. Create WorkOrder document with status history
   * 5. Return confirmation message
   */
  const createArgs = parseNewTicket(q);
  if (createArgs) {
    if (!user) {
      return NextResponse.json({ answer: "Please sign in to create a work order.", citations: [] });
    }
    try {
      const seq = Math.floor((Date.now() / 1000) % 100000);
      const code = `WO-${new Date().getFullYear()}-${seq}`;
      const wo = await WorkOrder.create({
        tenantId: user.orgId,
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
      const answer = `Created work order ${(wo as unknown as WorkOrderItem).code} – "${wo.title}" with priority ${wo.priority}.`;
      return NextResponse.json({ answer, citations: [] as Citation[] });
    } catch (_e: unknown) {
      const errorMsg = _e instanceof Error ? _e.message : "unknown error";
      return NextResponse.json({ answer: `Could not create work order: ${errorMsg}`, citations: [] as Citation[] });
    }
  }

  /**
   * TOOL 2: List User's Tickets
   * 
   * Retrieves user's recent work orders when requested via:
   * - "/my-tickets" command
   * - Natural language like "show my tickets"
   * 
   * Returns up to 5 most recent work orders with code, title, and status.
   * Requires authentication - anonymous users receive a sign-in prompt.
   */
  if (isMyTickets(q)) {
    if (!user) {
      return NextResponse.json({ answer: "Please sign in to view your tickets.", citations: [] });
    }
    const items = await WorkOrder.find({ tenantId: user.orgId, createdBy: user.id })
      .sort?.({ createdAt: -1 })
      .limit?.(5) || [];
    // TODO(schema-migration): Use workOrderNumber instead of code
    const lines = (Array.isArray(items) ? items : []).map((it: any) => `• ${it.code}: ${it.title} – ${it.status}`);
    const answer = lines.length ? `Your recent work orders:\n${lines.join("\n")}` : "You have no work orders yet.";
    return NextResponse.json({ answer, citations: [] as Citation[] });
  }

  /**
   * TOOL 3: Knowledge Base Search
   * 
   * When question doesn't match specific tools, we search the Help Article KB
   * using MongoDB text search for relevant documentation.
   * 
   * Search Strategy:
   * 1. Try MongoDB $text search for indexed content
   * 2. Fallback: Simple title/content substring matching
   * 3. Return top 5 articles with citations
   * 
   * This provides general help without requiring authentication.
   */
  let docs: HelpArticleDoc[] = [];
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
      docs = docs.filter(d => (d.title || "").toLowerCase().includes(s) || (d.content || "").toLowerCase().includes(s)).slice(0, 5);
    } catch {}
  }

  const citations: Citation[] = (docs || []).map((d: HelpArticleDoc) => ({ title: d.title, slug: d.slug })).slice(0, 5);
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



