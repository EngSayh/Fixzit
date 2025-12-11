/**
 * @fileoverview Copilot Stream API Route
 * @description Streams AI responses using Vercel AI SDK with real-time text generation, intent classification, and knowledge retrieval for interactive chat experiences.
 * @route POST /api/copilot/stream - Stream AI responses via Server-Sent Events (SSE)
 * @access Authenticated users (cookie or bearer token)
 * @module copilot
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { resolveCopilotSession } from "@/server/copilot/session";
import { evaluateMessagePolicy } from "@/server/copilot/policy";
import { retrieveKnowledge } from "@/server/copilot/retrieval";
import { generateCopilotStreamResponse } from "@/server/copilot/llm";
import { recordAudit } from "@/server/copilot/audit";
import { classifyIntent, detectSentiment } from "@/server/copilot/classifier";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { validateSystemGovernors } from "@/server/copilot/governors";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

type Message = z.infer<typeof messageSchema>;

const requestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  history: z.array(messageSchema).optional(),
  locale: z.enum(["en", "ar"]).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/copilot/stream:
 *   post:
 *     summary: Stream AI responses using Vercel AI SDK
 *     tags: [copilot]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *               locale:
 *                 type: string
 *                 enum: [en, ar]
 *     responses:
 *       200:
 *         description: Streaming response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied by system governors
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - more strict for AI endpoints (distributed for multi-instance)
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`copilot:stream:${clientIp}`, 30, 60_000); // 30 requests per minute
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Resolve user session
    const session = await resolveCopilotSession(req);

    // Parse and validate request body
    const json = await req.json();
    const body = requestSchema.parse(json);

    const locale = body.locale || session.locale;
    const message = body.message.trim();

    // System Governors - validate user access and intent
    const governorCheck = await validateSystemGovernors({
      session,
      message,
      locale,
      endpoint: "stream",
    });

    if (!governorCheck.allowed) {
      await recordAudit({
        session,
        intent: "policy_denied",
        status: "DENIED",
        message: governorCheck.reason,
        prompt: message,
        metadata: { governor: governorCheck.governor },
      });

      return new Response(
        JSON.stringify({
          error: governorCheck.reason,
          governor: governorCheck.governor,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Classify intent and detect sentiment
    const intent = classifyIntent(message, locale);
    const sentiment = detectSentiment(message);

    // Log negative sentiment for monitoring
    if (sentiment === "negative") {
      logger.warn("[copilot:stream] Negative sentiment detected", {
        userId: session.userId,
        message: message.slice(0, 100),
      });
    }

    // Evaluate message policy
    const policy = evaluateMessagePolicy({ ...session, locale }, message);
    if (!policy.allowed) {
      const response =
        locale === "ar"
          ? `لا يمكنني مشاركة هذه المعلومات بسبب قيود الصلاحيات.`
          : `I cannot share that information due to permission restrictions.`;

      await recordAudit({
        session,
        intent: "policy_denied",
        status: "DENIED",
        message: response,
        prompt: message,
        metadata: { dataClass: policy.dataClass },
      });

      return new Response(JSON.stringify({ error: response }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Retrieve relevant knowledge
    const docs = await retrieveKnowledge({ ...session, locale }, message);

    // Generate streaming response
    const result = await generateCopilotStreamResponse({
      session: { ...session, locale },
      prompt: message,
      history: body.history as Message[],
      docs,
    });

    // Record audit for successful request
    await recordAudit({
      session,
      intent,
      status: "SUCCESS",
      message: "Stream initiated",
      prompt: message,
      metadata: {
        docIds: docs.map((doc) => doc.id),
        sentiment,
      },
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error: unknown) {
    logger.error(
      "Copilot stream error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        fallback: "An error occurred while processing your request.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
