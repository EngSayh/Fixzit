import { nanoid } from 'nanoid';

/**
 * Correlation context for request tracking
 */
interface CorrelationContext {
  id: string;
  timestamp: number;
  requestId?: string;
}

// Global correlation context store
const correlationStore = new Map<string, CorrelationContext>();

/**
 * Create a new correlation context for request tracking
 */
export function createCorrelationContext(requestId?: string): string {
  const correlationId = nanoid(12);
  const context: CorrelationContext = {
    id: correlationId,
    timestamp: Date.now(),
    requestId
  };
  
  correlationStore.set(correlationId, context);
  
  // Clean up old contexts (older than 10 minutes)
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, ctx] of correlationStore.entries()) {
    if (ctx.timestamp < cutoff) {
      correlationStore.delete(id);
    }
  }
  
  return correlationId;
}

/**
 * Get correlation context by ID
 */
export function getCorrelationContext(correlationId: string): CorrelationContext | undefined {
  return correlationStore.get(correlationId);
}

/**
 * Log with correlation ID for debugging and tracking
 */
export function logWithCorrelation(
  event: string,
  message: string,
  data?: any,
  correlationId?: string
): void {
  const id = correlationId || createCorrelationContext();
  const context = getCorrelationContext(id);
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    correlationId: id,
    event,
    message,
    data,
    context: context ? {
      requestId: context.requestId,
      age: Date.now() - context.timestamp
    } : undefined
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${event}] ${message}`, logEntry);
  }
  
  // In production, this would typically go to a logging service
  // For now, we'll use console.log with structured format
  console.log(JSON.stringify(logEntry));
}

/**
 * Create correlation middleware for Express-like frameworks
 */
export function correlationMiddleware() {
  return function(req: any, res: any, next: any) {
    const correlationId = req.headers['x-correlation-id'] || createCorrelationContext();
    
    // Attach to request
    req.correlationId = correlationId;
    
    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);
    
    logWithCorrelation('request-start', `${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress
    }, correlationId);
    
    next();
  };
}

/**
 * Extract correlation ID from request headers
 */
export function extractCorrelationId(request: Request): string {
  return request.headers.get('X-Correlation-ID') || createCorrelationContext();
}

/**
 * Add correlation ID to response headers
 */
export function addCorrelationHeaders(response: Response, correlationId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Correlation-ID', correlationId);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}