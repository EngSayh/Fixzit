/**
 * @module lib/tracing
 * @description OpenTelemetry distributed tracing configuration and utilities.
 *
 * Provides tracer instrumentation for distributed tracing across services.
 * Exports tracer, span utilities, and trace context propagation helpers.
 *
 * @features
 * - OpenTelemetry tracer initialization
 * - Span creation and management (internal, server, client, producer, consumer)
 * - Trace context propagation (traceId, spanId, traceFlags)
 * - Span attributes and events
 * - Span status tracking (ok, error, unset)
 * - Performance metrics (start/end time, duration)
 *
 * @usage
 * ```typescript
 * import { startSpan, endSpan, addSpanEvent } from '@/lib/tracing';
 * 
 * const span = startSpan({
 *   name: 'database.query',
 *   attributes: { table: 'users', operation: 'SELECT' },
 *   kind: 'client',
 * });
 * 
 * try {
 *   await db.query('SELECT * FROM users');
 *   endSpan(span, { status: 'ok' });
 * } catch (error) {
 *   addSpanEvent(span, 'error', { message: error.message });
 *   endSpan(span, { status: 'error' });
 * }
 * ```
 *
 * @see https://opentelemetry.io/docs/languages/js/
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface SpanOptions {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  kind?: "internal" | "server" | "client" | "producer" | "consumer";
}

export interface TracingContext {
  traceId?: string;
  spanId?: string;
  traceFlags?: number;
}

export interface SpanInfo {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, string | number | boolean>;
  status: "ok" | "error" | "unset";
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * OpenTelemetry configuration from environment
 */
export const tracingConfig = {
  enabled: process.env.OTEL_ENABLED === "true",
  serviceName: process.env.OTEL_SERVICE_NAME || "fixzit",
  serviceVersion: process.env.npm_package_version || "1.0.0",
  environment: process.env.NODE_ENV || "development",
  collectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
  samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || "1.0"),
  debug: process.env.OTEL_DEBUG === "true",
} as const;

// ============================================================================
// Lightweight Tracer (No Dependencies)
// ============================================================================

/**
 * Generate a random trace ID (32 hex chars)
 */
function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Generate a random span ID (16 hex chars)
 */
function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Current active span stack (per-request context)
 */
const spanStack: SpanInfo[] = [];

/**
 * Completed spans buffer for batch export
 */
const spanBuffer: SpanInfo[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Create and start a new span
 */
export function startSpan(options: SpanOptions): SpanInfo {
  const parentSpan = spanStack[spanStack.length - 1];

  const span: SpanInfo = {
    traceId: parentSpan?.traceId || generateTraceId(),
    spanId: generateSpanId(),
    name: options.name,
    startTime: Date.now(),
    attributes: {
      ...options.attributes,
      "service.name": tracingConfig.serviceName,
      "service.version": tracingConfig.serviceVersion,
      environment: tracingConfig.environment,
    },
    status: "unset",
    events: [],
  };

  if (parentSpan) {
    span.attributes["parent.span.id"] = parentSpan.spanId;
  }

  spanStack.push(span);

  if (tracingConfig.debug) {
    logger.debug(`[Tracing] Started span: ${span.name}`, {
      traceId: span.traceId,
      spanId: span.spanId,
    });
  }

  return span;
}

/**
 * End the current span
 */
export function endSpan(span: SpanInfo, status: "ok" | "error" = "ok"): void {
  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
  span.status = status;

  // Remove from active stack
  const index = spanStack.indexOf(span);
  if (index > -1) {
    spanStack.splice(index, 1);
  }

  // Add to buffer
  spanBuffer.push(span);

  if (tracingConfig.debug) {
    logger.debug(`[Tracing] Ended span: ${span.name}`, {
      traceId: span.traceId,
      spanId: span.spanId,
      duration: span.duration,
      status: span.status,
    });
  }

  // Flush if buffer is full
  if (spanBuffer.length >= MAX_BUFFER_SIZE) {
    flushSpans();
  }
}

/**
 * Add an event to a span
 */
export function addSpanEvent(
  span: SpanInfo,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  span.events.push({
    name,
    timestamp: Date.now(),
    attributes,
  });
}

/**
 * Set span attributes
 */
export function setSpanAttributes(
  span: SpanInfo,
  attributes: Record<string, string | number | boolean>
): void {
  Object.assign(span.attributes, attributes);
}

/**
 * Record an exception on a span
 */
export function recordException(span: SpanInfo, error: Error): void {
  addSpanEvent(span, "exception", {
    "exception.type": error.name,
    "exception.message": error.message,
    "exception.stacktrace": error.stack || "",
  });
  span.status = "error";
}

/**
 * Get current active span
 */
export function getCurrentSpan(): SpanInfo | undefined {
  return spanStack[spanStack.length - 1];
}

/**
 * Get current tracing context
 */
export function getTracingContext(): TracingContext {
  const span = getCurrentSpan();
  return {
    traceId: span?.traceId,
    spanId: span?.spanId,
  };
}

// ============================================================================
// Span Wrapper Utilities
// ============================================================================

/**
 * Wrap an async function with tracing
 *
 * @example
 * const result = await withSpan({ name: 'fetchUser' }, async (span) => {
 *   setSpanAttributes(span, { userId: '123' });
 *   return await db.users.findOne({ id: '123' });
 * });
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: (span: SpanInfo) => Promise<T>
): Promise<T> {
  const span = startSpan(options);

  try {
    const result = await fn(span);
    endSpan(span, "ok");
    return result;
  } catch (error) {
    if (error instanceof Error) {
      recordException(span, error);
    }
    endSpan(span, "error");
    throw error;
  }
}

/**
 * Wrap a sync function with tracing
 */
export function withSpanSync<T>(
  options: SpanOptions,
  fn: (span: SpanInfo) => T
): T {
  const span = startSpan(options);

  try {
    const result = fn(span);
    endSpan(span, "ok");
    return result;
  } catch (error) {
    if (error instanceof Error) {
      recordException(span, error);
    }
    endSpan(span, "error");
    throw error;
  }
}

// ============================================================================
// HTTP Instrumentation Helpers
// ============================================================================

/**
 * Extract trace headers from incoming request
 */
export function extractTraceHeaders(
  headers: Headers | Record<string, string>
): TracingContext {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(key);
    }
    return headers[key] || null;
  };

  const traceparent = get("traceparent");
  if (traceparent) {
    // W3C Trace Context format: 00-{trace-id}-{span-id}-{flags}
    const parts = traceparent.split("-");
    if (parts.length === 4) {
      return {
        traceId: parts[1],
        spanId: parts[2],
        traceFlags: parseInt(parts[3], 16),
      };
    }
  }

  return {};
}

/**
 * Create trace headers for outgoing request
 */
export function injectTraceHeaders(): Record<string, string> {
  const context = getTracingContext();
  if (!context.traceId || !context.spanId) {
    return {};
  }

  return {
    traceparent: `00-${context.traceId}-${context.spanId}-01`,
    "x-trace-id": context.traceId,
  };
}

/**
 * Create a span for an HTTP request
 */
export function startHttpSpan(
  method: string,
  url: string,
  headers?: Headers
): SpanInfo {
  const traceContext = headers ? extractTraceHeaders(headers) : {};

  return startSpan({
    name: `HTTP ${method}`,
    kind: "server",
    attributes: {
      "http.method": method,
      "http.url": url,
      "http.target": new URL(url, "http://localhost").pathname,
      ...(traceContext.traceId && { "parent.trace.id": traceContext.traceId }),
    },
  });
}

/**
 * End an HTTP span with response info
 */
export function endHttpSpan(
  span: SpanInfo,
  statusCode: number,
  contentLength?: number
): void {
  setSpanAttributes(span, {
    "http.status_code": statusCode,
    ...(contentLength && { "http.response_content_length": contentLength }),
  });

  endSpan(span, statusCode >= 400 ? "error" : "ok");
}

// ============================================================================
// Database Instrumentation Helpers
// ============================================================================

/**
 * Create a span for a database operation
 */
export function startDbSpan(
  operation: string,
  collection: string,
  query?: Record<string, unknown>
): SpanInfo {
  return startSpan({
    name: `DB ${operation} ${collection}`,
    kind: "client",
    attributes: {
      "db.system": "mongodb",
      "db.operation": operation,
      "db.collection": collection,
      ...(query && { "db.statement": JSON.stringify(query).slice(0, 500) }),
    },
  });
}

// ============================================================================
// Span Export
// ============================================================================

/**
 * Flush buffered spans to collector
 */
export async function flushSpans(): Promise<void> {
  if (spanBuffer.length === 0) return;

  const spans = [...spanBuffer];
  spanBuffer.length = 0;

  if (!tracingConfig.enabled) {
    if (tracingConfig.debug) {
      logger.debug(`[Tracing] Would export ${spans.length} spans (disabled)`);
    }
    return;
  }

  try {
    // OTLP JSON export
    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: tracingConfig.serviceName } },
              { key: "service.version", value: { stringValue: tracingConfig.serviceVersion } },
              { key: "deployment.environment", value: { stringValue: tracingConfig.environment } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: "fixzit-tracer", version: "1.0.0" },
              spans: spans.map((span) => ({
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                startTimeUnixNano: span.startTime * 1_000_000,
                endTimeUnixNano: (span.endTime || Date.now()) * 1_000_000,
                attributes: Object.entries(span.attributes).map(([key, value]) => ({
                  key,
                  value: typeof value === "string" 
                    ? { stringValue: value }
                    : typeof value === "number"
                    ? { intValue: value }
                    : { boolValue: value },
                })),
                events: span.events.map((e) => ({
                  name: e.name,
                  timeUnixNano: e.timestamp * 1_000_000,
                  attributes: Object.entries(e.attributes || {}).map(([key, value]) => ({
                    key,
                    value: { stringValue: String(value) },
                  })),
                })),
                status: {
                  code: span.status === "ok" ? 1 : span.status === "error" ? 2 : 0,
                },
              })),
            },
          ],
        },
      ],
    };

    await fetch(`${tracingConfig.collectorUrl}/v1/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (tracingConfig.debug) {
      logger.debug(`[Tracing] Exported ${spans.length} spans`);
    }
  } catch (error) {
    logger.error("[Tracing] Failed to export spans", { error });
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize tracing (call once at app startup)
 */
export function initTracing(): void {
  if (!tracingConfig.enabled) {
    logger.info("[Tracing] Disabled - set OTEL_ENABLED=true to enable");
    return;
  }

  logger.info("[Tracing] Initialized", {
    serviceName: tracingConfig.serviceName,
    serviceVersion: tracingConfig.serviceVersion,
    environment: tracingConfig.environment,
    collectorUrl: tracingConfig.collectorUrl,
    samplingRatio: tracingConfig.samplingRatio,
  });

  // Flush on process exit
  if (typeof process !== "undefined") {
    process.on("beforeExit", () => {
      flushSpans();
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  initTracing,
  startSpan,
  endSpan,
  addSpanEvent,
  setSpanAttributes,
  recordException,
  getCurrentSpan,
  getTracingContext,
  withSpan,
  withSpanSync,
  extractTraceHeaders,
  injectTraceHeaders,
  startHttpSpan,
  endHttpSpan,
  startDbSpan,
  flushSpans,
  config: tracingConfig,
};
