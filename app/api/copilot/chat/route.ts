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

  const contentType = req.headers.get("content-type") || "";
  let body: z.infer<typeof requestSchema>;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
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
          ? "مرحباً! يمكنني مساعدتك في معرفة المزيد عن Fixzit.\n\nيمكنني:\n• شرح كيفية عمل النظام\n• الإجابة على الأسئلة حول الميزات\n• مساعدتك في البدء\n\nلإنشاء طلبات صيانة أو الوصول إلى بيانات محددة، يرجى تسجيل الدخول أو التسجيل للحصول على حساب."
          : "Hi! I can help you learn about Fixzit.\n\nI can:\n• Explain how the system works\n• Answer questions about features\n• Help you get started\n\nTo create maintenance tickets, access specific data, or perform actions, please sign in or register for an account.";

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
      // NOTE: Escalation workflow deferred to Phase 2 - requires support ticket integration
      // When implemented, will create support ticket for negative sentiment conversations
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
}
