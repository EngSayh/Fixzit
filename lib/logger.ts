/* eslint-disable no-console -- This IS the logger utility, console calls are intentional */
/**
 * Production-safe logging utility
 * - Structured JSON logging when LOG_FORMAT=json
 * - Sentry context tagging for FM/Souq/Aqar modules
 * - Environment-aware console output (dev vs prod vs test)
 */

import { sanitizeError, sanitizeLogParams } from "@/lib/security/log-sanitizer";

type LogLevel = "info" | "warn" | "error" | "debug";
type ModuleKey = "fm" | "souq" | "aqar" | "core";
type SerializableId = string | number | { toString(): string } | null | undefined;

interface LogContext {
  component?: string;
  action?: string;
  userId?: SerializableId;
  orgId?: SerializableId;
  tenantId?: SerializableId;
  requestId?: string;
  route?: string;
  path?: string;
  endpoint?: string;
  module?: ModuleKey | string;
  feature?: string;
  ip?: string;
  [key: string]: unknown;
}

const STRUCTURED_LOGGING =
  (process.env.LOG_FORMAT || "").toLowerCase() === "json";

const moduleMatchers: Array<{ key: ModuleKey; tests: RegExp[] }> = [
  { key: "fm", tests: [/\/fm\//i, /\bfm\b/i, /facility/i] },
  { key: "souq", tests: [/souq/i, /marketplace/i] },
  { key: "aqar", tests: [/aqar/i] },
];

const hasKeys = (
  obj?: Record<string, unknown> | null,
): obj is Record<string, unknown> => Boolean(obj && Object.keys(obj).length);

function deriveModule(context?: LogContext, message?: string): ModuleKey {
  const path = (context?.path || context?.route || "") as string;
  const endpoint = (context?.endpoint || "") as string;
  const source = `${path} ${endpoint} ${message ?? ""}`.toLowerCase();

  if (
    context?.module &&
    ["fm", "souq", "aqar", "core"].includes(String(context.module))
  ) {
    return (context.module as ModuleKey) || "core";
  }

  for (const matcher of moduleMatchers) {
    if (matcher.tests.some((re) => re.test(path) || re.test(source))) {
      return matcher.key;
    }
  }

  return "core";
}

class Logger {
  private readonly structured = STRUCTURED_LOGGING;

  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  private get isTest(): boolean {
    return process.env.NODE_ENV === "test";
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    const cleaned = sanitizeLogParams(
      context as Record<string, unknown>,
    ) as LogContext;
    return hasKeys(cleaned) ? cleaned : undefined;
  }

  private consoleFor(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case "info":
        return console.info;
      case "warn":
        return console.warn;
      case "error":
        return console.error;
      case "debug":
        return console.debug;
      default:
        return console.log;
    }
  }

  private buildStructuredPayload(
    level: LogLevel,
    message: string,
    moduleKey: ModuleKey,
    context?: LogContext,
    extra?: unknown,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: moduleKey,
      environment: process.env.NODE_ENV,
    };

    if (context?.requestId) payload.requestId = context.requestId;
    if (context?.orgId) payload.orgId = context.orgId;
    if (context?.tenantId) payload.tenantId = context.tenantId;
    if (context?.userId) payload.userId = context.userId;
    if (context?.path || context?.route)
      payload.path = context.path ?? context.route;
    if (context?.endpoint) payload.endpoint = context.endpoint;
    if (context?.action) payload.action = context.action;
    if (context?.component) payload.component = context.component;
    if (context?.feature) payload.feature = context.feature;
    if (context?.ip) payload.ip = context.ip;
    if (context && hasKeys(context)) {
      payload.context = context;
    }
    if (extra) {
      payload.error = extra;
    }

    return payload;
  }

  private logToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext,
    extra?: unknown,
  ): void {
    const moduleKey = deriveModule(context, message);
    const payload = this.buildStructuredPayload(
      level,
      message,
      moduleKey,
      context,
      extra,
    );
    const writer = this.consoleFor(level);

    if (this.structured) {
      writer(JSON.stringify(payload));
      return;
    }

    const parts: unknown[] = [`[${level.toUpperCase()}] ${message}`];
    if (context && hasKeys(context)) parts.push(context);
    if (extra) parts.push(extra);
    writer(...parts);
  }

  /**
   * Log informational message (development only)
   */
  info(message: string, context?: LogContext): void {
    const safeContext = this.sanitizeContext(context);
    if (this.isDevelopment && !this.isTest) {
      this.logToConsole("info", message, safeContext);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const safeContext = this.sanitizeContext(context);
    if (!this.isTest) {
      this.logToConsole("warn", message, safeContext);
      if (!this.isDevelopment) {
        void this.sendToMonitoring("warn", message, safeContext);
      }
    }
  }

  /**
   * Log error message and send to monitoring
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const safeContext = this.sanitizeContext(context);
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : sanitizeError(error);

    if (!this.isTest) {
      this.logToConsole("error", message, safeContext, errorInfo);
      void this.sendToMonitoring(
        "error",
        message,
        { ...safeContext, ...errorInfo },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Debug logging (development only)
   */
  debug(message: string, data?: unknown): void {
    const safeData =
      data && typeof data === "object"
        ? sanitizeLogParams(data as Record<string, unknown>)
        : data;
    if (this.isDevelopment && !this.isTest) {
      this.logToConsole(
        "debug",
        message,
        safeData ? { data: safeData } : undefined,
      );
    }
  }

  /**
   * Send log to monitoring service (Sentry integration)
   */
  private async sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext,
    errorToCapture?: Error,
  ): Promise<void> {
    // Suppress monitoring integrations outside production to avoid noisy dev/test instrumentation
    if (process.env.NODE_ENV !== "production" || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return;
    }

    try {
      const Sentry = await import("@sentry/nextjs").catch((importError) => {
        console.error("[Logger] Failed to import Sentry:", importError);
        return null;
      });
      if (!Sentry) return;

      const moduleKey = deriveModule(context, message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyScope = (scope: any) => {
        if (moduleKey) scope.setTag("module", moduleKey);
        if (context?.orgId) scope.setTag("orgId", String(context.orgId));
        if (context?.tenantId) scope.setTag("tenantId", String(context.tenantId));
        if (context?.requestId) scope.setTag("request_id", String(context.requestId));
        if (context?.userId) scope.setUser({ id: String(context.userId) });
        if (context?.feature) scope.setTag("feature", String(context.feature));
        if (context?.path || context?.route || context?.action || context?.component) {
          scope.setContext("request", {
            path: (context.path ?? context.route) as string,
            action: context.action,
            component: context.component,
          });
        }
        if (context) {
          scope.setExtra("context", context);
        }
      };

      if (level === "error") {
        Sentry.withScope((scope) => {
          applyScope(scope);
          scope.setLevel("error");
          const err = errorToCapture ?? new Error(message);
          Sentry.captureException(err);
        });
      } else if (level === "warn") {
        Sentry.withScope((scope) => {
          applyScope(scope);
          scope.setLevel("warning");
          if (scope.setFingerprint) {
            scope.setFingerprint([moduleKey ?? "core", message]);
          }
          Sentry.captureMessage(message);
        });
      }

      // Store a lightweight copy in session for browser debugging
      if (typeof window !== "undefined" && window.sessionStorage) {
        const payload = this.buildStructuredPayload(
          level,
          message,
          moduleKey,
          context,
        );
        const logs = JSON.parse(sessionStorage.getItem("app_logs") || "[]");
        logs.push(payload);
        if (logs.length > 100) logs.shift();
        sessionStorage.setItem("app_logs", JSON.stringify(logs));
      }
    } catch (err) {
      // Silently fail - don't break app if logging fails
      if (this.isDevelopment) {
        console.error("Failed to send log to monitoring:", err);
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);
