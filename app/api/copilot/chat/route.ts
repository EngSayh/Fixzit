/**
 * @fileoverview Copilot Chat API Route
 * @description Handles AI-powered chat interactions with message policy evaluation, intent classification, sentiment detection, tool execution, and knowledge retrieval for context-aware responses.
 * @route POST /api/copilot/chat - Process user messages and return AI-generated responses
 * @access Authenticated users (cookie or bearer token)
 * @module copilot
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { resolveCopilotSession } from "@/server/copilot/session";
import {
  evaluateMessagePolicy,
  describeDataClass,
  redactSensitiveText,
  getPermittedTools,
} from "@/server/copilot/policy";
import { detectToolFromMessage, executeTool } from "@/server/copilot/tools";
import { retrieveKnowledge } from "@/server/copilot/retrieval";
import { generateCopilotResponse } from "@/server/copilot/llm";
import { recordAudit } from "@/server/copilot/audit";
import { classifyIntent, detectSentiment } from "@/server/copilot/classifier";
import {
  searchAvailableUnits,
  formatApartmentResults,
} from "@/server/copilot/apartmentSearch";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { SupportTicket } from "@/server/models/SupportTicket";
import { connectMongo } from "@/lib/mongodb-unified";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// Infer Message type from schema to avoid duplication
type Message = z.infer<typeof messageSchema>;

const toolSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
});

const requestSchema = z.object({
  message: z.string().optional(),
  history: z.array(messageSchema).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  tool: toolSchema.optional(),
});

const multipartRequestSchema = z.object({
  tool: toolSchema,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/copilot/chat:
 *   post:
 *     summary: copilot/chat operations
 *     tags: [copilot]
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
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const session = await resolveCopilotSession(req);

  // Cross-tenant guard: non-guest sessions must carry a tenant/org id
  if (session.role !== "GUEST" && (!session.tenantId || session.tenantId === "public")) {
    return createSecureResponse(
      {
        error: "Tenant context required",
        requiresAuth: true,
      },
      401,
      req,
    );
  }

  const contentType = req.headers.get("content-type") || "";
  let body: z.infer<typeof requestSchema>;

  if (contentType.includes("multipart/form-data")) {
    const formData = (await req.formData()) as globalThis.FormData;
    const toolName = String(formData.get("tool") || "");
    const argsRaw = formData.get("args");
    const file = formData.get("file");
    const workOrderId = formData.get("workOrderId");

    if (!toolName) {
      return createSecureResponse({ error: "Tool name is required" }, 400, req);
    }

    let args: Record<string, unknown> = {};
    if (typeof argsRaw === "string" && argsRaw) {
      try {
        args = JSON.parse(argsRaw) as Record<string, unknown>;
      } catch (error) {
        logger.warn("[copilot] Invalid JSON in multipart args", { error });
        return createSecureResponse(
          { error: "Invalid args payload (must be JSON)" },
          400,
          req,
        );
      }
    }

    if (file instanceof File) {
      // Validate file size (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return createSecureResponse(
          { error: "File size exceeds 10MB limit" },
          400,
          req,
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      args.buffer = buffer;
      args.fileName = file.name;
      args.mimeType = file.type || "application/octet-stream";
    }

    if (typeof workOrderId === "string" && workOrderId) {
      args.workOrderId = workOrderId;
    }

    // Validate the constructed body against schema
    body = multipartRequestSchema.parse({ tool: { name: toolName, args } });
  } else {
    let json: unknown;
    try {
      json = await req.json();
    } catch (error) {
      logger.warn("[copilot] Invalid JSON body", { error });
      return createSecureResponse(
        { error: "Invalid JSON payload" },
        400,
        req,
      );
    }
    if (!json || (typeof json === "object" && Object.keys(json as object).length === 0)) {
      return createSecureResponse({ error: "Request body is required" }, 400, req);
    }
    body = requestSchema.parse(json);
  }

  const locale = body.locale || session.locale;

  try {
    if (body.tool) {
      if (!getPermittedTools(session.role).includes(body.tool.name)) {
        await recordAudit({
          session,
          intent: body.tool.name,
          tool: body.tool.name,
          status: "DENIED",
          message: "Tool not allowed",
        });
        const deniedMessage =
          locale === "ar"
            ? "ليست لديك الصلاحية لاستخدام هذا الإجراء. يرجى تسجيل الدخول للوصول إلى هذه الميزة."
            : "You do not have permission to run this action. Please sign in to access this feature.";
        return createSecureResponse(
          {
            reply: deniedMessage,
            requiresAuth: session.role === "GUEST",
          },
          403,
          req,
        );
      }

      const result = await executeTool(body.tool.name, body.tool.args || {}, {
        ...session,
        locale,
      });
      await recordAudit({
        session,
        intent: result.intent,
        tool: body.tool.name,
        status: "SUCCESS",
        message: result.message,
        metadata: result.data ? { payload: result.data } : undefined,
      });
      return NextResponse.json({
        reply: result.message,
        data: result.data,
        intent: result.intent,
      });
    }

    const message = body.message?.trim();
    if (!message) {
      return createSecureResponse({ error: "Message is required" }, 400, req);
    }

    // Cross-tenant message guard: explicitly deny attempts to access other tenant/org data
    const crossTenantPattern =
      /another company|other company|different tenant|another tenant|other org|other organization/i;
    if (crossTenantPattern.test(message)) {
      const denial =
        locale === "ar"
          ? "لا يمكن الوصول إلى بيانات شركة أخرى. هذا الإجراء غير مسموح."
          : "You cannot access another company’s data. This action is not allowed.";
      await recordAudit({
        session,
        intent: "cross_tenant_denied",
        status: "DENIED",
        message: denial,
        prompt: message,
        metadata: { reason: "cross_tenant_request" },
      });
      return NextResponse.json(
        {
          reply: denial,
          intent: "cross_tenant_denied",
          requiresAuth: session.role === "GUEST",
        },
        { status: 200 },
      );
    }

    // Strict data-class enforcement BEFORE guest guidance or intent routing
    const policy = evaluateMessagePolicy({ ...session, locale }, message);
    if (!policy.allowed) {
      const response =
        locale === "ar"
          ? `لا يمكنني مشاركة هذه المعلومات لأنها ${describeDataClass(policy.dataClass)} ولا يتيحها دورك.`
          : `I cannot share that because it is ${describeDataClass(policy.dataClass)} data and your role is not permitted.`;
      await recordAudit({
        session,
        intent: "policy_denied",
        status: "DENIED",
        message: response,
        prompt: message,
        metadata: { dataClass: policy.dataClass },
      });
      return createSecureResponse({ reply: response }, 403, req);
    }

    // Enhanced GUEST user guidance (after policy guard)
    if (session.role === "GUEST") {
      const guestMessage =
        locale === "ar"
          ? "مرحباً! يمكنني مساعدتك في معرفة المزيد عن Fixzit.\n\nيمكنني:\n• شرح كيفية عمل النظام\n• الإجابة على الأسئلة حول الميزات\n• مساعدتك في البدء\n\nلا يمكنك الوصول إلى بيانات الشركات الأخرى أو تنفيذ إجراءات على الحسابات حتى تقوم بتسجيل الدخول بحسابك. لإنشاء طلبات صيانة أو الوصول إلى بيانات محددة، يرجى تسجيل الدخول أو التسجيل للحصول على حساب."
          : "Hi! I can help you learn about Fixzit.\n\nI can:\n• Explain how the system works\n• Answer questions about features\n• Help you get started\n\nYou cannot access other company data or perform account actions until you sign in. To create maintenance tickets or access specific data, please sign in or register.";

      await recordAudit({
        session,
        intent: "guest_info",
        status: "SUCCESS",
        message: guestMessage,
        prompt: message,
      });

      return NextResponse.json({
        reply: guestMessage,
        intent: "guest_info",
        requiresAuth: true,
      });
    }

    // Classify intent and detect sentiment for routing and escalation
    const intent = classifyIntent(message, locale);
    const sentiment = detectSentiment(message);

    // Log analytics for sentiment tracking
    if (sentiment === "negative") {
      logger.warn("[copilot] Negative sentiment detected", {
        userId: session.userId,
        message: message.slice(0, 100),
      });
      
      // Escalate to support ticket for negative sentiment conversations
      try {
        await connectMongo();
        const ticketCode = `CPE-${Date.now().toString(36).toUpperCase()}`;
        await SupportTicket.create({
          orgId: session.tenantId,
          code: ticketCode,
          subject: `[Copilot Escalation] Negative sentiment detected`,
          module: "Other",
          type: "Complaint",
          priority: "Medium",
          category: "General",
          subCategory: "Feedback",
          status: "New",
          requester: {
            name: session.name || "Copilot User",
            email: session.email || undefined,
          },
          messages: [{
            byUserId: session.userId,
            byRole: session.role,
            at: new Date(),
            text: `User message with negative sentiment:\n\n"${message.slice(0, 500)}"\n\nDetected sentiment: ${sentiment}\nIntent classified as: ${intent}`,
          }],
        });
        logger.info("[copilot] Escalation ticket created", { ticketCode, userId: session.userId });
      } catch (escalationError) {
        // Log but don't fail the main request if escalation fails
        logger.error("[copilot] Failed to create escalation ticket", { error: escalationError });
      }
    }

    // Handle apartment search intent via dedicated module
    if (intent === "APARTMENT_SEARCH") {
      const units = await searchAvailableUnits(message, {
        userId: session.userId,
        orgId: session.tenantId,
        role: session.role as never,
        locale,
      });
      const reply = formatApartmentResults(units, locale);
      await recordAudit({
        session,
        intent: "apartment_search",
        status: "SUCCESS",
        message: reply,
        prompt: message,
        metadata: { unitCount: units.length },
      });
      return NextResponse.json({ reply, intent, data: { units } });
    }

    const toolFromMessage = detectToolFromMessage(message);
    if (toolFromMessage) {
      const result = await executeTool(
        toolFromMessage.name,
        toolFromMessage.args,
        { ...session, locale },
      );
      await recordAudit({
        session,
        intent: result.intent,
        tool: toolFromMessage.name,
        status: "SUCCESS",
        message: result.message,
        prompt: message,
        metadata: result.data ? { payload: result.data } : undefined,
      });
      return NextResponse.json({
        reply: result.message,
        data: result.data,
        intent: result.intent,
      });
    }

    const docs = await retrieveKnowledge({ ...session, locale }, message);
    const reply = await generateCopilotResponse({
      session: { ...session, locale },
      prompt: message,
      history: body.history as Message[],
      docs,
    });

    await recordAudit({
      session,
      intent: "chat",
      status: "SUCCESS",
      message: reply,
      prompt: message,
      metadata: { docIds: docs.map((doc) => doc.id) },
    });

    return NextResponse.json({
      reply: redactSensitiveText(reply),
      sources: docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        score: doc.score,
        source: doc.source,
      })),
    });
  } catch (error: unknown) {
    logger.error(
      "Copilot chat error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const stack = error instanceof Error ? error.stack : String(error);
    await recordAudit({
      session,
      intent: body.tool?.name || "chat",
      status: "ERROR",
      message: errorMessage,
      prompt: body.message,
      metadata: { stack, error: String(error) },
    });
    return NextResponse.json(
      {
        reply:
          locale === "ar"
            ? "حدث خطأ أثناء معالجة الطلب."
            : "Something went wrong while processing the request.",
        error: errorMessage,
      },
      { status: 500 },
    );
  }

  // Fallback safeguard (should not reach here)
  const fallback =
    locale === "ar"
      ? "لا يمكن إتمام الطلب حالياً. يرجى المحاولة لاحقاً."
      : "Request cannot be completed right now. Please try again later.";
  return NextResponse.json(
    { reply: fallback, intent: "fallback" },
    { status: 200 },
  );
}
