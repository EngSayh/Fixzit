import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCopilotSession } from "@/src/server/copilot/session";
import { evaluateMessagePolicy, describeDataClass, redactSensitiveText, getPermittedTools } from "@/src/server/copilot/policy";
import { detectToolFromMessage, executeTool } from "@/src/server/copilot/tools";
import { retrieveKnowledge } from "@/src/server/copilot/retrieval";
import { generateCopilotResponse } from "@/src/server/copilot/llm";
import { recordAudit } from "@/src/server/copilot/audit";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

const requestSchema = z.object({
  message: z.string().optional(),
  history: z.array(messageSchema).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  tool: z.object({
    name: z.string(),
    args: z.record(z.string(), z.any()).optional()
  }).optional()
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    const args = typeof argsRaw === "string" && argsRaw ? JSON.parse(argsRaw) : {};

    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      args.buffer = buffer;
      args.fileName = file.name;
      args.mimeType = file.type || "application/octet-stream";
    }

    if (typeof workOrderId === "string" && workOrderId) {
      args.workOrderId = workOrderId;
    }

    body = { tool: { name: toolName, args } } as any;
  } else {
    const json = await req.json();
    body = requestSchema.parse(json);
  }

  const locale = body.locale || session.locale;

  try {
    if (body.tool) {
      if (!getPermittedTools(session.role).includes(body.tool.name)) {
        await recordAudit({ session, intent: body.tool.name, tool: body.tool.name, status: "DENIED", message: "Tool not allowed" });
        return NextResponse.json({
          reply: locale === "ar"
            ? "ليست لديك الصلاحية لاستخدام هذا الإجراء."
            : "You do not have permission to run this action."
        }, { status: 403 });
      }

      const result = await executeTool(body.tool.name, body.tool.args || {}, { ...session, locale });
      await recordAudit({
        session,
        intent: result.intent,
        tool: body.tool.name,
        status: "SUCCESS",
        message: result.message,
        metadata: result.data ? { payload: result.data } : undefined
      });
      return NextResponse.json({
        reply: result.message,
        data: result.data,
        intent: result.intent
      });
    }

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const toolFromMessage = detectToolFromMessage(message);
    if (toolFromMessage) {
      const result = await executeTool(toolFromMessage.name, toolFromMessage.args, { ...session, locale });
      await recordAudit({
        session,
        intent: result.intent,
        tool: toolFromMessage.name,
        status: "SUCCESS",
        message: result.message,
        prompt: message,
        metadata: result.data ? { payload: result.data } : undefined
      });
      return NextResponse.json({ reply: result.message, data: result.data, intent: result.intent });
    }

    const policy = evaluateMessagePolicy({ ...session, locale }, message);
    if (!policy.allowed) {
      const response = locale === "ar"
        ? `لا يمكنني مشاركة هذه المعلومات لأنها ${describeDataClass(policy.dataClass)} ولا يتيحها دورك.`
        : `I cannot share that because it is ${describeDataClass(policy.dataClass)} data and your role is not permitted.`;
      await recordAudit({ session, intent: "policy_denied", status: "DENIED", message: response, prompt: message, metadata: { dataClass: policy.dataClass } });
      return NextResponse.json({ reply: response }, { status: 403 });
    }

    const docs = await retrieveKnowledge({ ...session, locale }, message);
    const reply = await generateCopilotResponse({ session: { ...session, locale }, prompt: message, history: body.history as any, docs });

    await recordAudit({
      session,
      intent: "chat",
      status: "SUCCESS",
      message: reply,
      prompt: message,
      metadata: { docIds: docs.map(doc => doc.id) }
    });

    return NextResponse.json({
      reply: redactSensitiveText(reply),
      sources: docs.map(doc => ({ id: doc.id, title: doc.title, score: doc.score, source: doc.source }))
    });
  } catch (error: any) {
    console.error("Copilot chat error", error);
    await recordAudit({ session, intent: body.tool?.name || "chat", status: "ERROR", message: error?.message, prompt: body.message, metadata: { stack: error?.stack } });
    return NextResponse.json({
      reply: locale === "ar"
        ? "حدث خطأ أثناء معالجة الطلب."
        : "Something went wrong while processing the request.",
      error: error?.message
    }, { status: 500 });
  }
}
