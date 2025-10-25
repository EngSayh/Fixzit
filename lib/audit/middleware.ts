import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AuditLogModel } from '@/server/models/AuditLog';

/**
 * Audit Log Middleware Configuration
 */
export interface AuditConfig {
  enabled: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
}

const defaultConfig: AuditConfig = {
  enabled: true,
  excludePaths: ['/api/health', '/api/ping', '/_next', '/static'],
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
  logRequestBody: false,
  logResponseBody: false,
};

/**
 * Extract action type from HTTP method and path
 */
function getActionType(method: string, path: string): string {
  if (method === 'GET') return 'READ';
  if (method === 'POST') {
    if (path.includes('/login')) return 'LOGIN';
    if (path.includes('/logout')) return 'LOGOUT';
    if (path.includes('/upload')) return 'UPLOAD';
    if (path.includes('/export')) return 'EXPORT';
    if (path.includes('/import')) return 'IMPORT';
    return 'CREATE';
  }
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return 'CUSTOM';
}

/**
 * Extract entity type from path
 */
function getEntityType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  
  if (apiIndex >= 0 && segments.length > apiIndex + 1) {
    const entity = segments[apiIndex + 1].toUpperCase();
    
    // Map common entities
    const entityMap: Record<string, string> = {
      'PROPERTIES': 'PROPERTY',
      'TENANTS': 'TENANT',
      'OWNERS': 'OWNER',
      'CONTRACTS': 'CONTRACT',
      'PAYMENTS': 'PAYMENT',
      'INVOICES': 'INVOICE',
      'WORKORDERS': 'WORKORDER',
      'TICKETS': 'TICKET',
      'PROJECTS': 'PROJECT',
      'BIDS': 'BID',
      'VENDORS': 'VENDOR',
      'USERS': 'USER',
      'DOCUMENTS': 'DOCUMENT',
      'SETTINGS': 'SETTING',
    };
    
    return entityMap[entity] || 'OTHER';
  }
  
  return 'OTHER';
}

/**
 * Audit Log Middleware
 * 
 * Automatically logs all API requests to the audit log
 */
export async function auditLogMiddleware(
  request: NextRequest,
  config: Partial<AuditConfig> = {}
) {
  const finalConfig = { ...defaultConfig, ...config };
  
  if (!finalConfig.enabled) {
    return null;
  }
  
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Check if path should be excluded
  const shouldExclude = finalConfig.excludePaths?.some(path => pathname.startsWith(path));
  if (shouldExclude) {
    return null;
  }
  
  // Check if method should be excluded
  if (finalConfig.excludeMethods?.includes(method)) {
    return null;
  }
  
  // Get user session
  const session = await auth();
  if (!session?.user) {
    // Don't log unauthenticated requests
    return null;
  }
  
  // Extract request context
  const userAgent = request.headers.get('user-agent') || '';
  const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
  
  // Prepare audit log data
  const auditData = {
    orgId: session.user.orgId || 'default',
    action: getActionType(method, pathname),
    entityType: getEntityType(pathname),
    entityId: extractEntityId(pathname),
    userId: session.user.id || session.user.email || 'unknown',
    userName: session.user.name || 'Unknown User',
    userEmail: session.user.email || '',
    userRole: session.user.role || 'USER',
    context: {
      method,
      endpoint: pathname,
      userAgent,
      ipAddress,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionId: (session.user as any).sessionId,
      browser: extractBrowser(userAgent),
      os: extractOS(userAgent),
      device: extractDevice(userAgent),
    },
    metadata: {
      source: 'WEB' as const,
    },
    result: {
      success: true, // Will be updated after request completes
      duration: 0,
    },
  };
  
  return auditData;
}

/**
 * Log the audit entry to database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logAudit(auditData: any, response?: NextResponse) {
  try {
    // Update result based on response
    if (response) {
      auditData.result.success = response.status >= 200 && response.status < 400;
      if (!auditData.result.success) {
        auditData.result.errorCode = response.status.toString();
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (AuditLogModel as any).log(auditData);
  } catch (error) {
    // Silent fail - don't break the main request
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Extract entity ID from path
 */
function extractEntityId(path: string): string | undefined {
  const segments = path.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  
  // ID is usually after the entity name: /api/properties/123
  if (apiIndex >= 0 && segments.length > apiIndex + 2) {
    const possibleId = segments[apiIndex + 2];
    // Simple check if it looks like an ID
    if (possibleId.length > 8 && !possibleId.includes('.')) {
      return possibleId;
    }
  }
  
  return undefined;
}

/**
 * Extract browser from user agent
 */
function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

/**
 * Extract OS from user agent
 */
function extractOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Extract device type from user agent
 */
function extractDevice(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

/**
 * Manual audit log function for custom events
 */
export async function createAuditLog(data: {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  userId: string;
  orgId: string;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (AuditLogModel as any).log(data);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export default auditLogMiddleware;
