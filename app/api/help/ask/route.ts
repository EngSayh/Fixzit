import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import Redis from "ioredis";
import { Filter, Document } from "mongodb";

import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

type AskRequest = {
  question: string;
  limit?: number;
  category?: string;
  lang?: string;
  route?: string;
};

interface UserWithAuth {
  orgId?: string;
  tenantId?: string;
  role?: string;
}

interface SearchChunk {
  slug?: string;
  articleId?: string;
  title?: string;
  text?: string;
  updatedAt?: string | Date;
}

function redactPII(s: string) {
  return (
    s
      // Email addresses
      .replace(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        "[redacted email]",
      )
      // Phone patterns: optional country code, optional area code, standard 7-10 digits with separators
      .replace(
        /\b(?:\+?(\d{1,3})?[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
        "[redacted phone]",
      )
      // Credit card patterns (13-16 digits with optional spaces/dashes)
      .replace(/\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g, "[redacted card]")
      // SSN patterns (XXX-XX-XXXX)
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted SSN]")
      // IP addresses (IPv4)
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted IP]")
      // 8-digit numeric IDs (may include Omani Civil IDs, invoice numbers, dates YYYYMMDD, etc.; trades precision for safety)
      .replace(/\b\d{8}\b/g, "[redacted ID]")
  );
}

/**
 * Builds a plain-text heuristic answer from a list of article contexts for a given question.
 *
 * Produces a short human-readable summary: a header indicating whether any matching articles
 * were found for `question`, followed by up to three bullet lines. Each bullet contains the
 * context's title and a whitespace-normalized snippet of its text (trimmed to 400 characters).
 * A trailing ellipsis is added to a snippet when it was truncated.
 *
 * @param question - The user's question used in the header.
 * @param contexts - Array of contexts where each item has a `title` and `text`; only the first three are used.
 * @returns A single newline-separated string containing the header and bullet lines.
 */
// Maximum length for context snippets in heuristic answers.
// 400 was chosen to balance informativeness and brevity for UI display and model input.
// You can override this value by setting the MAX_SNIPPET_LENGTH environment variable.
const MAX_SNIPPET_LENGTH_ENV = Number(process.env.MAX_SNIPPET_LENGTH);
const MAX_SNIPPET_LENGTH =
  Number.isFinite(MAX_SNIPPET_LENGTH_ENV) && MAX_SNIPPET_LENGTH_ENV > 0
    ? Math.floor(MAX_SNIPPET_LENGTH_ENV)
    : 400;
function buildHeuristicAnswer(
  question: string,
  contexts: Array<{ title: string; text: string }>,
) {
  const lines: string[] = [];
  lines.push(
    contexts.length
      ? `Here is what I found about: "${question}"`
      : `No matching articles found for: "${question}"`,
  );
  for (const ctx of contexts.slice(0, 3)) {
    const originalText = ctx.text.replace(/\s+/g, " ");
    const wasTruncated = originalText.length > MAX_SNIPPET_LENGTH;
    const snippet = originalText.slice(0, MAX_SNIPPET_LENGTH).trim();
    lines.push(`- ${ctx.title}: ${snippet}${wasTruncated ? "…" : ""}`);
  }
  return lines.join("\n");
}

/**
 * Optionally requests an OpenAI chat completion to produce a concise answer based on provided contexts.
 *
 * If OPENAI_API_KEY is not set, the request fails, the API returns a non-OK response, or an error occurs, this function returns `null`.
 *
 * @param question - The user's question to answer.
 * @param contexts - Array of context strings to provide to the model (each typically "title\ntext").
 * @returns A string with the model's reply, or `null` if no API key is configured or the request fails.
 */
async function maybeSummarizeWithOpenAI(
  question: string,
  contexts: string[],
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  let t: NodeJS.Timeout | undefined;
  try {
    const controller = new AbortController();
    t = setTimeout(() => controller.abort(), 8000);
    const messages = [
      {
        role: "system",
        content:
          "Answer concisely using ONLY the provided context. Include a short step list when relevant. English only.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${contexts.join("\n---\n")}`,
      },
    ];
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  } finally {
    if (t) clearTimeout(t);
  }
}

/**
 * Handle POST requests to answer a user question by searching help articles and optionally using OpenAI.
 *
 * Validates the request body for a non-empty `question` (responds 400 if missing), queries the `helparticles`
 * MongoDB collection (ensuring a text index) for published articles (optionally filtered by `category`),
 * and builds an answer from either an OpenAI summary (when OPENAI_API_KEY is configured and the call succeeds)
 * or a deterministic heuristic summary. The JSON response contains `answer` and `citations` (matched docs' slug,
 * title, and updatedAt). Returns a 500 response on unexpected errors.
 *
 * @returns A NextResponse with JSON `{ answer, citations }` on success, or `{ error }` with status 400/500 on failure.
 */
/**
 * @openapi
 * /api/help/ask:
 *   post:
 *     summary: help/ask operations
 *     tags: [help]
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
  const rateLimitResponse = enforceRateLimit(req, { requests: 20, windowMs: 60_000, keyPrefix: "help:ask" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const sessionResult = await getSessionOrNull(req, { route: "help:ask" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    // Distributed rate limit per IP (uses Redis if available, falls back to in-memory)
    await rateLimitAssert(req);
    const { data: body, error: parseError } = await parseBodySafe<AskRequest>(req, { logPrefix: "[help:ask]" });
    if (parseError) {
      return createSecureResponse({ error: "Invalid request body" }, 400, req);
    }
    const question = typeof body?.question === "string" ? body.question : "";
    const rawLimit = Number(body?.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(8, Math.floor(rawLimit))
        : 5;
    const category =
      typeof body?.category === "string" ? body.category : undefined;
    const lang = typeof body?.lang === "string" ? body.lang : "en";
    const userWithAuth = user as UserWithAuth | null;
    const role = userWithAuth?.role || undefined;
    const route = typeof body?.route === "string" ? body.route : undefined;
    if (!question || !question.trim()) {
      return createSecureResponse({ error: "Missing question" }, 400, req);
    }

    const db = await getDatabase();
    type Doc = {
      slug: string;
      title: string;
      content: string;
      updatedAt?: Date;
    };
    const coll = db.collection<Doc>("helparticles");

    // Text index is created by scripts/add-database-indexes.js

    // Enforce tenant isolation; allow global articles with no orgId
    const orClauses: Filter<Document>[] = [
      { orgId: { $exists: false } },
      { orgId: null },
    ];
    if (user?.orgId) orClauses.unshift({ orgId: user.orgId });
    const tenantScope = { $or: orClauses };
    const filter: Filter<Document> = { status: "PUBLISHED", ...tenantScope };
    if (category) filter.category = category;

    // Prefer vector search if available
    let docs: Doc[] = [];
    try {
      const { embedText } = await import("@/ai/embeddings");
      const { performKbSearch } = await import("@/kb/search");
      const qVec = await embedText(question);
      const chunks = await performKbSearch({
        tenantId: user?.tenantId,
        query: qVec,
        q: question,
        lang,
        role,
        route,
        limit,
      });
      const typedChunks = (chunks || []) as SearchChunk[];
      docs = typedChunks.map((c) => ({
        slug: c.slug || c.articleId || "",
        title: c.title || "",
        content: c.text || "",
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
      }));
    } catch (e) {
      logger.error(
        "Vector search failed, falling back to lexical search",
        e instanceof Error ? e : new Error(String(e)),
        { route: "/api/help/ask", context: "vector-search" },
      );
    }

    if (!docs || docs.length === 0) {
      try {
        docs = await coll
          .find(
            { ...filter, $text: { $search: question } },
            {
              projection: {
                score: { $meta: "textScore" },
                slug: 1,
                title: 1,
                content: 1,
                updatedAt: 1,
              },
            },
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(Math.min(8, Math.max(1, limit)))
          .toArray();
      } catch {
        // Fallback when text index is missing: restrict by recent updatedAt to reduce collection scan
        const safe = new RegExp(
          question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        );
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        const regexFilter: Filter<Document> = {
          ...filter,
          updatedAt: { $gte: cutoffDate },
          $or: [{ title: safe }, { content: safe }, { tags: safe }],
        };
        docs = await coll
          .find(regexFilter, {
            projection: { slug: 1, title: 1, content: 1, updatedAt: 1 },
          })
          .sort({ updatedAt: -1 })
          .limit(Math.min(8, Math.max(1, limit)))
          .toArray();
      }
    }

    const contexts = docs.slice(0, 3).map((d: Doc) => ({
      title: d.title,
      text: (d.content || "").slice(0, 2000),
    }));
    const contextTexts = contexts.map(
      (c) => `${c.title}\n${redactPII(c.text)}`,
    );

    // Try to summarize with OpenAI if configured; otherwise deterministic heuristic
    const aiAnswer = await maybeSummarizeWithOpenAI(
      redactPII(question),
      contextTexts,
    );
    const answer = aiAnswer || buildHeuristicAnswer(question, contexts);

    const citations = docs.map((d: Doc) => ({
      slug: d.slug,
      title: d.title,
      updatedAt: d.updatedAt,
    }));
    return NextResponse.json({ answer, citations });
  } catch (_err: Error | unknown) {
    if (_err instanceof Error && _err.message === "Rate limited") {
      return NextResponse.json(
        {
          name: "RateLimited",
          code: "HELP_ASK_RATE_LIMITED",
          userMessage: "Too many requests, please wait a minute.",
          correlationId:
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
        { status: 429 },
      );
    }
    const correlationId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    logger.error(
      "help/ask error",
      _err instanceof Error ? _err : new Error(String(_err)),
      { correlationId },
    );
    return NextResponse.json(
      {
        name: "HelpAskError",
        code: "HELP_ASK_FAILED",
        userMessage: "Unable to process your question. Please try again.",
        correlationId,
      },
      { status: 500 },
    );
  }
}

// Distributed rate limiter using Redis for multi-instance deployments
// Falls back to in-memory implementation if Redis is not available
const MAX_RATE_PER_MIN_ENV = Number(process.env.HELP_ASK_MAX_RATE_PER_MIN);
const MAX_RATE_PER_MIN =
  Number.isFinite(MAX_RATE_PER_MIN_ENV) && MAX_RATE_PER_MIN_ENV > 0
    ? Math.floor(MAX_RATE_PER_MIN_ENV)
    : 30;

// Initialize Redis client if connection URL is provided
// Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
const redisConnectionUrl = process.env.REDIS_URL || process.env.REDIS_KEY;
let redis: Redis | null = null;
let redisDisabled = false;

function maskRedisUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "****";
    if (parsed.username) parsed.username = "****";
    return parsed.toString();
  } catch {
    return url.length > 12 ? `${url.slice(0, 6)}****${url.slice(-4)}` : "****";
  }
}

function isFatalRedisError(error: Error) {
  const code = (error as { code?: string }).code || "";
  return (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("EAI_AGAIN")
  );
}

function disableRedis(reason: string, error?: Error) {
  if (redisDisabled) return;
  redisDisabled = true;
  if (redis) {
    try {
      redis.disconnect();
    } catch (disconnectErr) {
      logger.warn(
        "Redis disconnect failed after fatal error",
        {
          error: disconnectErr instanceof Error
            ? disconnectErr
            : new Error(String(disconnectErr)),
          route: "/api/help/ask",
          context: "redis-disable",
        },
      );
    } finally {
      redis = null;
    }
  }
  logger.warn("Redis disabled for help/ask, using in-memory rate limit only", {
    route: "/api/help/ask",
    context: "redis-disable",
    reason,
    error: error?.message,
    redisUrl: maskRedisUrl(redisConnectionUrl),
  });
}

if (redisConnectionUrl) {
  try {
    redis = new Redis(redisConnectionUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      connectTimeout: 5000,
      commandTimeout: 5000,
    });

    // Handle connection events for monitoring
    redis.on("error", (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Redis connection error", error, {
        route: "/api/help/ask",
        context: "redis-connection",
        redisUrl: maskRedisUrl(redisConnectionUrl),
        code: (error as { code?: string }).code,
      });
      if (isFatalRedisError(error)) {
        disableRedis("fatal-dns-error", error);
      }
    });

    redis.on("close", () => {
      if (redisDisabled) return;
      logger.warn(
        "Redis connection closed, will attempt to reconnect automatically",
      );
      // Don't set redis = null - let it reconnect automatically
    });

    redis.on("reconnecting", () => {
      if (redisDisabled) return;
      logger.info("Redis reconnecting...");
    });

    redis.on("ready", () => {
      if (redisDisabled) return;
      logger.info("Redis connection restored");
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Failed to initialize Redis client", error, {
      route: "/api/help/ask",
      context: "redis-init",
      redisUrl: maskRedisUrl(redisConnectionUrl),
    });
    if (isFatalRedisError(error)) {
      disableRedis("init-fatal", error);
    }
  }
}

// Fallback in-memory store for development/testing
const rateMap = new Map<string, { count: number; ts: number }>();

async function rateLimitAssert(req: NextRequest) {
  const ip = getClientIP(req);
  const key = `help:ask:${ip}`;

  // Try Redis first if available
  if (redis && !redisDisabled) {
    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, 60);
      const results = await multi.exec();

      if (
        results &&
        results[0] &&
        typeof results[0][1] === "number" &&
        results[0][1] > MAX_RATE_PER_MIN
      ) {
        throw new Error("Rate limited");
      }
      return;
    } catch (_err: Error | unknown) {
      if ((_err as Error).message === "Rate limited") throw _err;
      if (_err instanceof Error && isFatalRedisError(_err)) {
        disableRedis("fatal-dns-error", _err);
      }
      logger.error(
        "Redis rate limit check failed, falling back to in-memory",
        _err instanceof Error ? _err : new Error(String(_err)),
        { route: "/api/help/ask", context: "rate-limit-redis" },
      );
    }
  }

  // Fallback to in-memory implementation
  const now = Date.now();
  const rec = rateMap.get(key) || { count: 0, ts: now };
  if (now - rec.ts > 60_000) {
    rec.count = 0;
    rec.ts = now;
  }
  rec.count += 1;
  rateMap.set(key, rec);
  if (rec.count > MAX_RATE_PER_MIN) throw new Error("Rate limited");
}
// Note: Next.js restricts API route exports to HTTP methods only (GET, POST, etc.)
