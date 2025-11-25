import { logger } from "@/lib/logger";
import {
  trackAuthFailure,
  trackCorsViolation,
  trackRateLimitHit,
} from "@/lib/security/monitoring";

export type SecurityEventType = "rate_limit" | "cors_block" | "auth_failure";

export async function logSecurityEvent(event: {
  type: SecurityEventType;
  ip: string;
  path: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}) {
  logger.warn("[SecurityEvent]", event);
  try {
    switch (event.type) {
      case "rate_limit": {
        const endpoint = String(event.metadata?.keyPrefix ?? event.path);
        trackRateLimitHit(event.ip, endpoint);
        break;
      }
      case "cors_block": {
        const origin =
          typeof event.metadata?.origin === "string"
            ? (event.metadata.origin as string)
            : event.path;
        trackCorsViolation(origin, event.path);
        break;
      }
      case "auth_failure": {
        const identifier =
          (typeof event.metadata?.identifier === "string"
            ? (event.metadata.identifier as string)
            : null) ?? event.ip;
        const reason =
          typeof event.metadata?.reason === "string"
            ? (event.metadata.reason as string)
            : "unknown";
        trackAuthFailure(identifier, reason);
        break;
      }
    }
  } catch (monitoringError) {
    logger.error("[SecurityEvent] Failed to forward event to monitoring", {
      error:
        monitoringError instanceof Error
          ? monitoringError.message
          : monitoringError,
      eventType: event.type,
    });
  }
}
