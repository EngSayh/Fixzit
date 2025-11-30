/* eslint-disable no-console -- This IS the logger utility, console calls are intentional */
/**
 * Production-safe logging utility
 * Replaces console.* calls with proper logging that:
 * - Respects environment (dev vs production)
 * - Sends errors to monitoring service
 * - Provides structured logging
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  private get isTest(): boolean {
    return process.env.NODE_ENV === "test";
  }

  /**
   * Log informational message (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment && !this.isTest) {
      console.info(`[INFO] ${message}`, context || "");
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment || !this.isTest) {
      console.warn(`[WARN] ${message}`, context || "");
    }
    // In production, send to monitoring service
    if (!this.isDevelopment && !this.isTest) {
      this.sendToMonitoring("warn", message, context);
    }
  }

  /**
   * Log error message and send to monitoring
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : { error };

    if (this.isDevelopment && !this.isTest) {
      console.error(`[ERROR] ${message}`, errorInfo, context || "");
    }

    // Always send errors to monitoring (except in tests)
    if (!this.isTest) {
      this.sendToMonitoring("error", message, { ...context, ...errorInfo });
    }
  }

  /**
   * Debug logging (development only)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment && !this.isTest) {
      console.debug(`[DEBUG] ${message}`, data || "");
    }
  }

  /**
   * Send log to monitoring service (Sentry integration)
   */
  private async sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): Promise<void> {
    // Suppress monitoring integrations outside production to avoid noisy dev/test instrumentation
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    try {
      // Sentry integration for error tracking
      if (level === "error" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        const Sentry = await import("@sentry/nextjs").catch((importError) => {
          console.error('[Logger] Failed to import Sentry for error tracking:', importError);
          return null;
        });

        if (Sentry) {
          // Pass original Error if available, otherwise create new Error with cause
          let errorToCapture: Error;
          if (context?.error instanceof Error) {
            errorToCapture = context.error;
          } else {
            errorToCapture = new Error(message, {
              cause: context?.error,
            } as ErrorOptions);
          }

          Sentry.captureException(errorToCapture, {
            level: "error",
            extra: context,
            tags: {
              component: context?.component as string,
              action: context?.action as string,
              userId: context?.userId as string,
            },
          });
        }
      } else if (level === "warn" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        const Sentry = await import("@sentry/nextjs").catch((importError) => {
          console.error('[Logger] Failed to import Sentry for warning:', importError);
          return null;
        });

        if (Sentry) {
          Sentry.captureMessage(message, {
            level: "warning",
            extra: context,
          });
        }
      }

      // ✅ SECURITY FIX: DataDog integration removed from client-accessible logger
      // Moved to server-only module (/app/api/logs/route.ts) to prevent credential leaks
      // Client components should call /api/logs endpoint instead of accessing keys directly

      // Store in session for debugging (browser only)
      if (typeof window !== "undefined" && window.sessionStorage) {
        const logs = JSON.parse(sessionStorage.getItem("app_logs") || "[]");
        logs.push({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
        });
        // Keep only last 100 logs
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
