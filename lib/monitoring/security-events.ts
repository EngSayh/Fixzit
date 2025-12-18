import { logger } from "@/lib/logger";
import { redactIdentifier, redactMetadata } from "@/lib/otp-utils";
import {
  trackAuthFailure,
  trackCorsViolation,
  trackRateLimitHit,
} from "@/lib/security/monitoring";

export type SecurityEventType =
  | "rate_limit"
  | "ip_reputation_block"
  | "cors_block"
  | "auth_failure"
  | "csrf_violation";

/**
 * P123: Rate limit breach tracking for alerting
 * Tracks consecutive rate limit hits to trigger alerts
 */
const rateLimitBreachTracker = new Map<string, { count: number; firstSeen: number }>();
const BREACH_ALERT_THRESHOLD = 10; // Alert after 10 rate limit hits
const BREACH_WINDOW_MS = 60_000; // Within 1 minute

function checkAndAlertRateLimitBreach(ip: string, path: string): void {
  const key = `${ip}:${path}`;
  const now = Date.now();
  const existing = rateLimitBreachTracker.get(key);

  if (existing && now - existing.firstSeen < BREACH_WINDOW_MS) {
    existing.count++;
    if (existing.count === BREACH_ALERT_THRESHOLD) {
      // P123: Log alert for potential attack
      logger.error("[SecurityAlert] Rate limit breach threshold reached", {
        ip: redactIdentifier(ip),
        path,
        breachCount: existing.count,
        windowMs: BREACH_WINDOW_MS,
        severity: "HIGH",
        recommendation: "Consider IP block or CAPTCHA challenge",
      });
    }
  } else {
    rateLimitBreachTracker.set(key, { count: 1, firstSeen: now });
  }

  // Cleanup old entries (prevent memory leak)
  if (rateLimitBreachTracker.size > 10000) {
    const cutoff = now - BREACH_WINDOW_MS * 2;
    for (const [k, v] of rateLimitBreachTracker) {
      if (v.firstSeen < cutoff) {
        rateLimitBreachTracker.delete(k);
      }
    }
  }
}

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
  
  // Extract orgId from metadata for multi-tenant isolation.
  // NOTE: Metadata-based orgId is used for TELEMETRY ONLY (monitoring/alerting isolation).
  // This does NOT grant any permissions - it only affects how security events are grouped.
  // Spoofing would only misclassify the attacker's own events in monitoring dashboards.
  // For security-critical operations, use session.user.orgId from authenticated context.
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
        // P123: Check for breach alert threshold
        checkAndAlertRateLimitBreach(event.ip, endpoint);
        break;
      }
      case "ip_reputation_block": {
        const endpoint = `${event.path}:reputation-block`;
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
