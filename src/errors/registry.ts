// src/errors/registry.ts - Comprehensive Error Code Registry
export type ErrorSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type ErrorRegistryItem = {
  code: string;
  module: string;
  submodule: string;
  severity: ErrorSeverity;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  category: string;
  httpStatus?: number;
  retryable?: boolean;
  userAction_en?: string;
  userAction_ar?: string;
};

// Comprehensive Error Code Registry aligned with Fixzit modules
export const ERROR_REGISTRY: Record<string, ErrorRegistryItem> = {
  // Dashboard Errors
  'DASH-UI-LOAD-001': {
    code: 'DASH-UI-LOAD-001',
    module: 'Dashboard',
    submodule: 'UI',
    severity: 'P2',
    title_en: 'Dashboard failed to load',
    title_ar: 'فشل تحميل لوحة القيادة',
    category: 'UI',
    httpStatus: 500,
    retryable: true
  },
  
  // Work Orders Errors
  'WO-API-VAL-001': {
    code: 'WO-API-VAL-001',
    module: 'Work Orders',
    submodule: 'API',
    severity: 'P2',
    title_en: 'Missing required fields',
    title_ar: 'حقول مطلوبة مفقودة',
    description_en: 'Please fill in all required fields',
    description_ar: 'يرجى ملء جميع الحقول المطلوبة',
    category: 'VALIDATION',
    httpStatus: 400,
    retryable: false
  },
  'WO-API-SAVE-002': {
    code: 'WO-API-SAVE-002',
    module: 'Work Orders',
    submodule: 'API',
    severity: 'P1',
    title_en: 'Failed to save work order',
    title_ar: 'فشل حفظ أمر العمل',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  'WO-API-AUTH-003': {
    code: 'WO-API-AUTH-003',
    module: 'Work Orders',
    submodule: 'API',
    severity: 'P2',
    title_en: 'Not authorized to create work orders',
    title_ar: 'غير مصرح بإنشاء أوامر العمل',
    category: 'PERMISSION',
    httpStatus: 403,
    retryable: false
  },
  
  // Properties Errors
  'PROP-API-FETCH-001': {
    code: 'PROP-API-FETCH-001',
    module: 'Properties',
    submodule: 'API',
    severity: 'P2',
    title_en: 'Failed to load properties',
    title_ar: 'فشل تحميل العقارات',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  'PROP-UI-MAP-002': {
    code: 'PROP-UI-MAP-002',
    module: 'Properties',
    submodule: 'UI',
    severity: 'P3',
    title_en: 'Map service unavailable',
    title_ar: 'خدمة الخريطة غير متاحة',
    category: 'EXTERNAL',
    httpStatus: 503,
    retryable: true
  },
  
  // Finance Errors
  'FIN-API-INV-001': {
    code: 'FIN-API-INV-001',
    module: 'Finance',
    submodule: 'Invoice',
    severity: 'P1',
    title_en: 'Invoice generation failed',
    title_ar: 'فشل إنشاء الفاتورة',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  'FIN-API-PAY-002': {
    code: 'FIN-API-PAY-002',
    module: 'Finance',
    submodule: 'Payment',
    severity: 'P0',
    title_en: 'Payment processing failed',
    title_ar: 'فشل معالجة الدفعة',
    category: 'PAYMENT',
    httpStatus: 500,
    retryable: false,
    userAction_en: 'Please contact support immediately',
    userAction_ar: 'يرجى الاتصال بالدعم فوراً'
  },
  'FIN-API-TAX-003': {
    code: 'FIN-API-TAX-003',
    module: 'Finance',
    submodule: 'Tax',
    severity: 'P1',
    title_en: 'ZATCA integration error',
    title_ar: 'خطأ في تكامل هيئة الزكاة',
    category: 'EXTERNAL',
    httpStatus: 503,
    retryable: true
  },
  
  // HR Errors
  'HR-API-EMP-001': {
    code: 'HR-API-EMP-001',
    module: 'HR',
    submodule: 'Employee',
    severity: 'P2',
    title_en: 'Employee data not found',
    title_ar: 'بيانات الموظف غير موجودة',
    category: 'DATA',
    httpStatus: 404,
    retryable: false
  },
  'HR-API-LEAVE-002': {
    code: 'HR-API-LEAVE-002',
    module: 'HR',
    submodule: 'Leave',
    severity: 'P2',
    title_en: 'Leave request submission failed',
    title_ar: 'فشل تقديم طلب الإجازة',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  
  // Marketplace Errors
  'MKT-API-PROD-001': {
    code: 'MKT-API-PROD-001',
    module: 'Marketplace',
    submodule: 'Product',
    severity: 'P2',
    title_en: 'Product not available',
    title_ar: 'المنتج غير متوفر',
    category: 'INVENTORY',
    httpStatus: 404,
    retryable: false
  },
  'MKT-API-CART-002': {
    code: 'MKT-API-CART-002',
    module: 'Marketplace',
    submodule: 'Cart',
    severity: 'P2',
    title_en: 'Failed to add item to cart',
    title_ar: 'فشل إضافة المنتج إلى السلة',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  'MKT-API-RFQ-003': {
    code: 'MKT-API-RFQ-003',
    module: 'Marketplace',
    submodule: 'RFQ',
    severity: 'P2',
    title_en: 'RFQ submission failed',
    title_ar: 'فشل تقديم طلب عرض السعر',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  
  // Support Errors
  'SUP-API-TICKET-001': {
    code: 'SUP-API-TICKET-001',
    module: 'Support',
    submodule: 'Ticket',
    severity: 'P2',
    title_en: 'Failed to create support ticket',
    title_ar: 'فشل إنشاء تذكرة الدعم',
    category: 'API',
    httpStatus: 500,
    retryable: true
  },
  
  // Authentication Errors
  'AUTH-SESSION-EXP-001': {
    code: 'AUTH-SESSION-EXP-001',
    module: 'Authentication',
    submodule: 'Session',
    severity: 'P2',
    title_en: 'Your session has expired',
    title_ar: 'انتهت صلاحية جلستك',
    category: 'SESSION',
    httpStatus: 401,
    retryable: false,
    userAction_en: 'Please sign in again',
    userAction_ar: 'يرجى تسجيل الدخول مرة أخرى'
  },
  'AUTH-API-LOGIN-002': {
    code: 'AUTH-API-LOGIN-002',
    module: 'Authentication',
    submodule: 'Login',
    severity: 'P2',
    title_en: 'Invalid credentials',
    title_ar: 'بيانات اعتماد غير صالحة',
    category: 'VALIDATION',
    httpStatus: 401,
    retryable: false
  },
  
  // Generic UI Errors
  'UI-RENDER-FAIL-001': {
    code: 'UI-RENDER-FAIL-001',
    module: 'UI',
    submodule: 'Render',
    severity: 'P1',
    title_en: 'Page failed to render',
    title_ar: 'فشل عرض الصفحة',
    category: 'RENDER',
    httpStatus: 500,
    retryable: true
  },
  'UI-ROUTE-404-002': {
    code: 'UI-ROUTE-404-002',
    module: 'UI',
    submodule: 'Route',
    severity: 'P3',
    title_en: 'Page not found',
    title_ar: 'الصفحة غير موجودة',
    category: 'ROUTE',
    httpStatus: 404,
    retryable: false
  },
  
  // Network Errors
  'NET-CONN-FAIL-001': {
    code: 'NET-CONN-FAIL-001',
    module: 'Network',
    submodule: 'Connection',
    severity: 'P2',
    title_en: 'Network connection failed',
    title_ar: 'فشل الاتصال بالشبكة',
    category: 'NETWORK',
    httpStatus: 0,
    retryable: true,
    userAction_en: 'Check your internet connection',
    userAction_ar: 'تحقق من اتصالك بالإنترنت'
  },
  'NET-TIMEOUT-002': {
    code: 'NET-TIMEOUT-002',
    module: 'Network',
    submodule: 'Request',
    severity: 'P2',
    title_en: 'Request timed out',
    title_ar: 'انتهت مهلة الطلب',
    category: 'NETWORK',
    httpStatus: 408,
    retryable: true
  },
  
  // System Errors
  'SYS-DB-CONN-001': {
    code: 'SYS-DB-CONN-001',
    module: 'System',
    submodule: 'Database',
    severity: 'P0',
    title_en: 'Database connection failed',
    title_ar: 'فشل الاتصال بقاعدة البيانات',
    category: 'DATABASE',
    httpStatus: 503,
    retryable: true
  },
  'SYS-MEM-LIMIT-002': {
    code: 'SYS-MEM-LIMIT-002',
    module: 'System',
    submodule: 'Memory',
    severity: 'P0',
    title_en: 'System memory limit exceeded',
    title_ar: 'تم تجاوز حد ذاكرة النظام',
    category: 'RESOURCE',
    httpStatus: 503,
    retryable: false
  }
};

// Fallback for unknown errors
export const FALLBACK_ERROR: ErrorRegistryItem = {
  code: 'UI-UI-UNKNOWN-000',
  module: 'UI',
  submodule: 'Runtime',
  severity: 'P1',
  title_en: 'An unexpected error occurred',
  title_ar: 'حدث خطأ غير متوقع',
  category: 'UNKNOWN',
  httpStatus: 500,
  retryable: true
};

// Helper functions
export function getErrorByCode(code: string): ErrorRegistryItem {
  return ERROR_REGISTRY[code] || FALLBACK_ERROR;
}

export function getErrorsByModule(module: string): ErrorRegistryItem[] {
  return Object.values(ERROR_REGISTRY).filter(e => e.module === module);
}

export function getErrorsBySeverity(severity: ErrorSeverity): ErrorRegistryItem[] {
  return Object.values(ERROR_REGISTRY).filter(e => e.severity === severity);
}

// Export to CSV/JSON
export function exportErrorRegistry(format: 'csv' | 'json' = 'json'): string {
  const errors = Object.values(ERROR_REGISTRY);
  
  if (format === 'json') {
    return JSON.stringify(errors, null, 2);
  }
  
  // CSV format
  const headers = [
    'code', 'module', 'submodule', 'severity', 'category',
    'title_en', 'title_ar', 'description_en', 'description_ar',
    'httpStatus', 'retryable', 'userAction_en', 'userAction_ar'
  ];
  
  const rows = errors.map(e => headers.map(h => {
    const value = (e as any)[h];
    if (value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
    return String(value);
  }).join(','));
  
  return [headers.join(','), ...rows].join('\n');
}
