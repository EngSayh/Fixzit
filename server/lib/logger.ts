import { logger } from "@/lib/logger";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown> | undefined;

export function log(
  message: string,
  level: LogLevel = "info",
  context?: LogContext,
) {
  if (level === "error") {
    logger.error(message, context);
  } else if (level === "warn") {
    logger.warn(message, context);
  } else {
    logger.info(message, context);
  }
}
