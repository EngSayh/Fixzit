import { logger } from "@/lib/logger";
import { redactIdentifier } from "@/lib/security/log-sanitizer";
import {
  trackAuthFailure,
  trackCorsViolation,
  trackRateLimitHit,
} from "@/lib/security/monitoring";

export type SecurityEventType =
  | "rate_limit"
  | "cors_block"
  | "auth_failure"
  | "csrf_violation";

/**
 * Log a security event with PII redaction.
 * 
 * All identifiers (IPs, emails, etc.) are redacted in logs to prevent
 * PII leakage while preserving enough context for debugging.
 */
export async function logSecurityEvent(event: {
  type: SecurityEventType;
  ip: string;
  path: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}) {
  // Redact PII in the event log itself
  const safeEvent = {
    ...event,
    ip: redactIdentifier(event.ip),
    metadata: event.metadata ? {
      ...event.metadata,
      identifier: event.metadata.identifier 
        ? redactIdentifier(String(event.metadata.identifier))
        : undefined,
      origin: event.metadata.origin
        ? redactIdentifier(String(event.metadata.origin))
        : undefined,
    } : undefined,
  };
  
  logger.warn("[SecurityEvent]", safeEvent);
  try {
    switch (event.type) {
      case "rate_limit": {
        const endpoint = String(event.metadata?.keyPrefix ?? event.path);
        // Note: trackRateLimitHit now handles its own redaction internally
        trackRateLimitHit(event.ip, endpoint);
        break;
      }
      case "cors_block": {
        const origin =
          typeof event.metadata?.origin === "string"
            ? (event.metadata.origin as string)
            : event.path;
        // Note: trackCorsViolation now handles its own redaction internally
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
        // Note: trackAuthFailure now handles its own redaction internally
        trackAuthFailure(identifier, reason);
        break;
      }
      case "csrf_violation": {
        const reason =
          typeof event.metadata?.reason === "string"
            ? (event.metadata.reason as string)
            : "csrf_violation";
        trackAuthFailure(event.ip, reason);
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
