import { ErrorItem, ErrorReport, ModuleKey, Severity } from './types';

export function generateIncidentId(): string {
  return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

export function generateCorrelationId(): string {
  return `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export function routeToModule(pathname: string): ModuleKey {
  if (pathname.startsWith('/work-orders')) return 'Work Orders';
  if (pathname.startsWith('/properties')) return 'Properties';
  if (pathname.startsWith('/finance')) return 'Finance';
  if (pathname.startsWith('/hr')) return 'HR';
  if (pathname.startsWith('/administration')) return 'Administration';
  if (pathname.startsWith('/crm')) return 'CRM';
  if (pathname.startsWith('/marketplace')) return 'Marketplace';
  if (pathname.startsWith('/support')) return 'Support';
  if (pathname.startsWith('/compliance')) return 'Compliance';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/system')) return 'System';
  if (pathname.startsWith('/aqar')) return 'Aqar';
  if (pathname.startsWith('/souq')) return 'Souq';
  if (pathname.startsWith('/account')) return 'Account';
  if (pathname.startsWith('/billing')) return 'Billing';
  return 'Dashboard';
}

export function statusToSeverity(status?: number): Severity {
  if (!status) return 'ERROR';
  if (status >= 500) return 'CRITICAL';
  if (status >= 400) return 'ERROR';
  if (status >= 300) return 'WARN';
  return 'INFO';
}

export function redactPII(input?: string): string {
  if (!input) return '';
  
  return input
    .replace(/Bearer\s+[A-Za-z0-9\.\-_]+/g, 'Bearer ***')
    .replace(/"password":"[^"]+"/g, '"password":"***"')
    .replace(/"token":"[^"]+"/g, '"token":"***"')
    .replace(/"secret":"[^"]+"/g, '"secret":"***"')
    .replace(/"key":"[^"]+"/g, '"key":"***"')
    .replace(/"authorization":"[^"]+"/gi, '"authorization":"***"')
    .slice(0, 4000); // Limit length
}

export function buildClientContext() {
  if (typeof window === 'undefined') {
    return {
      url: '',
      userAgent: '',
      platform: '',
      width: 0,
      height: 0,
      online: true,
      locale: 'en',
      rtl: false,
      time: new Date().toISOString()
    };
  }

  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    width: window.innerWidth,
    height: window.innerHeight,
    online: navigator.onLine,
    locale: navigator.language,
    rtl: document.documentElement.dir === 'rtl',
    time: new Date().toISOString()
  };
}

export function buildUserContext() {
  if (typeof window === 'undefined') return {};

  try {
    const userStr = localStorage.getItem('x-user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId: user.tenantId,
        tenant: user.tenantId
      };
    }
  } catch (error) {
    console.warn('Failed to parse user context:', error);
  }

  return {};
}

export function createErrorItem(
  code: string,
  message: string,
  options: {
    stack?: string;
    httpStatus?: number;
    category?: string;
    severity?: Severity;
    module?: ModuleKey;
  } = {}
): ErrorItem {
  return {
    code,
    message,
    stack: options.stack,
    httpStatus: options.httpStatus,
    category: options.category,
    severity: options.severity || 'ERROR',
    module: options.module || 'System',
    timestamp: new Date().toISOString()
  };
}

export function createErrorReport(
  items: ErrorItem[],
  options: {
    incidentId?: string;
    correlationId?: string;
    route?: string;
    module?: ModuleKey;
    userContext?: any;
    clientContext?: any;
  } = {}
): ErrorReport {
  const incidentId = options.incidentId || generateIncidentId();
  const correlationId = options.correlationId || generateCorrelationId();
  const route = options.route || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const module = options.module || routeToModule(route);
  const userContext = options.userContext || buildUserContext();
  const clientContext = options.clientContext || buildClientContext();

  // Determine overall severity from items
  const severities = items.map(item => item.severity);
  const severityOrder = { 'INFO': 0, 'WARN': 1, 'ERROR': 2, 'CRITICAL': 3 };
  const maxSeverity = severities.reduce((max, current) => 
    severityOrder[current] > severityOrder[max] ? current : max, 'INFO' as Severity);

  return {
    incidentId,
    correlationId,
    orgId: userContext.orgId,
    userId: userContext.userId,
    userRole: userContext.role,
    locale: clientContext.locale,
    rtl: clientContext.rtl,
    route,
    module,
    severity: maxSeverity,
    items,
    device: {
      ua: clientContext.userAgent,
      platform: clientContext.platform,
      width: clientContext.width,
      height: clientContext.height,
      online: clientContext.online
    },
    network: {
      offline: !clientContext.online
    },
    createdAt: new Date().toISOString(),
    tags: items.map(item => item.category).filter(Boolean)
  };
}

export function formatErrorForCopy(errorReport: ErrorReport): string {
  const { incidentId, items, device, route, module, severity } = errorReport;
  
  const lines = [
    `🚨 Error Report - ${incidentId}`,
    `📅 Time: ${errorReport.createdAt}`,
    `🌐 URL: ${device?.ua ? `https://app.fixzit.com${route}` : 'N/A'}`,
    `📱 Module: ${module}`,
    `⚠️ Severity: ${severity}`,
    ``,
    `❌ Error Details:`
  ];

  items.forEach((item, index) => {
    lines.push(`  ${index + 1}. ${item.message}`);
    if (item.code) lines.push(`     Code: ${item.code}`);
    if (item.httpStatus) lines.push(`     HTTP: ${item.httpStatus}`);
    if (item.category) lines.push(`     Category: ${item.category}`);
  });

  if (device) {
    lines.push(``, `📊 System Information:`);
    lines.push(`  Platform: ${device.platform}`);
    lines.push(`  Online: ${device.online ? 'Yes' : 'No'}`);
    lines.push(`  Viewport: ${device.width}x${device.height}`);
  }

  return lines.join('\n');
}