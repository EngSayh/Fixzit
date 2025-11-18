/**
 * Security Event Monitoring
 * Centralized logging and telemetry for security-related events
 */

export type SecurityEventType = 
  | 'rate_limit' 
  | 'cors_block' 
  | 'auth_failure' 
  | 'invalid_token'
  | 'suspicious_activity';

export interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  path: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a security event for monitoring and alerting
 * In production, this should integrate with your monitoring service
 * (e.g., Datadog, New Relic, CloudWatch, Prometheus)
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const timestamp = event.timestamp || new Date().toISOString();
  
  const logEntry = {
    ...event,
    timestamp,
    environment: process.env.NODE_ENV || 'development',
  };

  // Console logging (always enabled)
  console.warn(`[SecurityEvent] ${event.type}`, logEntry);

  // TODO: Integrate with monitoring service
  // Example integrations:
  
  // Datadog
  // if (process.env.DATADOG_API_KEY) {
  //   await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
  //     method: 'POST',
  //     headers: {
  //       'DD-API-KEY': process.env.DATADOG_API_KEY,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(logEntry),
  //   });
  // }

  // CloudWatch
  // if (process.env.AWS_REGION) {
  //   const cloudwatch = new CloudWatchLogs({ region: process.env.AWS_REGION });
  //   await cloudwatch.putLogEvents({
  //     logGroupName: '/fixzit/security',
  //     logStreamName: event.type,
  //     logEvents: [{ timestamp: Date.now(), message: JSON.stringify(logEntry) }],
  //   });
  // }

  // Prometheus/Grafana (via metrics endpoint)
  // incrementMetric(`security_events_total`, { type: event.type, path: event.path });

  // File-based logging (for development/debugging)
  // NOTE: File system access is NOT available in Edge Runtime (middleware)
  // This block only runs in Node.js runtime (API routes, server components)
  if (
    process.env.NODE_ENV === 'development' && 
    process.env.LOG_SECURITY_EVENTS === 'file' &&
    typeof process.cwd === 'function' // Check if running in Node.js runtime
  ) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const logDir = path.join(process.cwd(), 'logs', 'security');
      const logFile = path.join(logDir, `${event.type}-${new Date().toISOString().split('T')[0]}.log`);
      
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('[SecurityEvent] Failed to write to log file:', err);
    }
  }
}

/**
 * Helper to extract client IP from request
 */
export function getClientIP(request: Request): string {
  // Check common headers (reverse proxy, load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (won't work in edge/serverless environments)
  return 'unknown';
}

/**
 * Safely extract pathname from request URL
 */
function getRequestPath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch (err) {
    console.error('[SecurityEvent] Failed to parse request URL:', err);
    return request.url || 'unknown';
  }
}

/**
 * Create a rate limit event logger
 */
export function createRateLimitLogger(endpoint: string, limit: number, windowMs: number) {
  return async (ip: string) => {
    await logSecurityEvent({
      type: 'rate_limit',
      ip,
      path: endpoint,
      metadata: {
        limit,
        window: `${windowMs / 1000}s`,
      },
    });
  };
}

/**
 * Create a CORS block event logger
 */
export function createCORSBlockLogger(request: Request, origin: string) {
  return async () => {
    await logSecurityEvent({
      type: 'cors_block',
      ip: getClientIP(request),
      path: getRequestPath(request),
      metadata: {
        origin,
        method: request.method,
      },
    });
  };
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(request: Request, reason: string): Promise<void> {
  await logSecurityEvent({
    type: 'auth_failure',
    ip: getClientIP(request),
    path: getRequestPath(request),
    metadata: { reason },
  });
}

/**
 * Log invalid token usage
 */
export async function logInvalidToken(request: Request, tokenType: string): Promise<void> {
  await logSecurityEvent({
    type: 'invalid_token',
    ip: getClientIP(request),
    path: getRequestPath(request),
    metadata: { tokenType },
  });
}
