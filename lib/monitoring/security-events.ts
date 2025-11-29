import { logger } from "@/lib/logger";
import { redactIdentifier, redactMetadata } from "@/lib/otp-utils";
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

export async function logSecurityEvent(event: {
  type: SecurityEventType;
  ip: string;
  path: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}) {
  // Redact IP and metadata for logging (PII protection)
  const redactedIp = redactIdentifier(event.ip);
  const redactedMetadata = redactMetadata(event.metadata);
  
  // Extract orgId from metadata for multi-tenant isolation
  const orgId = typeof event.metadata?.orgId === "string" 
    ? event.metadata.orgId 
    : undefined;
  
  logger.warn("[SecurityEvent]", { 
    ...event, 
    ip: redactedIp,
    metadata: redactedMetadata,
  });
  try {
    switch (event.type) {
      case "rate_limit": {
        const endpoint = String(event.metadata?.keyPrefix ?? event.path);
        trackRateLimitHit(event.ip, endpoint, orgId);
        break;
      }
      case "cors_block": {
        const origin =
          typeof event.metadata?.origin === "string"
            ? (event.metadata.origin as string)
            : event.path;
        trackCorsViolation(origin, event.path, orgId);
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
        trackAuthFailure(identifier, reason, orgId);
        break;
      }
      case "csrf_violation": {
        const reason =
          typeof event.metadata?.reason === "string"
            ? (event.metadata.reason as string)
            : "csrf_violation";
        trackAuthFailure(event.ip, reason, orgId);
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
