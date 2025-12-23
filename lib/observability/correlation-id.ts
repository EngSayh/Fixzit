/**
 * Request Correlation ID Generator
 * 
 * Generates unique request IDs for tracing requests across services.
 * Format: <timestamp>-<random>
 * 
 * @example "1702900800000-a1b2c3d4"
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Extract or generate correlation ID from request
 * 
 * Checks headers for existing ID (from upstream services/load balancer),
 * or generates a new one.
 */
export function getOrGenerateRequestId(request: Request | Headers): string {
  const headers = request instanceof Request ? request.headers : request;
  
  // Check common header names (prioritize existing IDs from upstream)
  const existingId =
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("x-amzn-trace-id") ||
    headers.get("traceparent");
  
  if (existingId) {
    return existingId;
  }
  
  return generateRequestId();
}
