import { ErrorRegistryItem } from './types';

export const ERROR_REGISTRY: Record<string, ErrorRegistryItem> = {
  // Work Orders Module
  'WO-API-VAL-001': {
    code: 'WO-API-VAL-001',
    module: 'WO',
    submodule: 'Create',
    severity: 'P2',
    title_en: 'Missing required fields for work order',
    title_ar: 'حقول مطلوبة مفقودة لأمر العمل',
    category: 'Validation',
    autoTicket: true,
    userFacing: true
  },
  'WO-API-SAVE-002': {
    code: 'WO-API-SAVE-002',
    module: 'WO',
    submodule: 'Save',
    severity: 'P2',
    title_en: 'Failed to save work order',
    title_ar: 'فشل في حفظ أمر العمل',
    category: 'API',
    autoTicket: true,
    userFacing: true
  },
  'WO-UI-LOAD-003': {
    code: 'WO-UI-LOAD-003',
    module: 'WO',
    submodule: 'Load',
    severity: 'P1',
    title_en: 'Work orders failed to load',
    title_ar: 'فشل في تحميل أوامر العمل',
    category: 'UI',
    autoTicket: true,
    userFacing: true
  },

  // Finance Module
  'FIN-API-PAY-001': {
    code: 'FIN-API-PAY-001',
    module: 'FIN',
    submodule: 'Payment',
    severity: 'P1',
    title_en: 'Payment processing failed',
    title_ar: 'فشل في معالجة الدفع',
    category: 'Payment',
    autoTicket: true,
    userFacing: true
  },
  'FIN-API-INV-002': {
    code: 'FIN-API-INV-002',
    module: 'FIN',
    submodule: 'Invoice',
    severity: 'P2',
    title_en: 'Invoice generation failed',
    title_ar: 'فشل في إنشاء الفاتورة',
    category: 'Invoice',
    autoTicket: true,
    userFacing: true
  },
  'FIN-UI-BAL-003': {
    code: 'FIN-UI-BAL-003',
    module: 'FIN',
    submodule: 'Balance',
    severity: 'P2',
    title_en: 'Balance information unavailable',
    title_ar: 'معلومات الرصيد غير متاحة',
    category: 'UI',
    autoTicket: false,
    userFacing: true
  },

  // Properties Module
  'PROP-API-LIST-001': {
    code: 'PROP-API-LIST-001',
    module: 'PROP',
    submodule: 'List',
    severity: 'P2',
    title_en: 'Properties list failed to load',
    title_ar: 'فشل في تحميل قائمة العقارات',
    category: 'API',
    autoTicket: true,
    userFacing: true
  },
  'PROP-API-SAVE-002': {
    code: 'PROP-API-SAVE-002',
    module: 'PROP',
    submodule: 'Save',
    severity: 'P2',
    title_en: 'Property details could not be saved',
    title_ar: 'لا يمكن حفظ تفاصيل العقار',
    category: 'API',
    autoTicket: true,
    userFacing: true
  },

  // Marketplace Module
  'MKT-API-ORD-001': {
    code: 'MKT-API-ORD-001',
    module: 'MKT',
    submodule: 'Order',
    severity: 'P1',
    title_en: 'Order processing failed',
    title_ar: 'فشل في معالجة الطلب',
    category: 'Order',
    autoTicket: true,
    userFacing: true
  },
  'MKT-UI-CAT-002': {
    code: 'MKT-UI-CAT-002',
    module: 'MKT',
    submodule: 'Catalog',
    severity: 'P2',
    title_en: 'Product catalog failed to load',
    title_ar: 'فشل في تحميل كتالوج المنتجات',
    category: 'UI',
    autoTicket: true,
    userFacing: true
  },

  // Authentication Module
  'AUTH-API-LOGIN-001': {
    code: 'AUTH-API-LOGIN-001',
    module: 'AUTH',
    submodule: 'Login',
    severity: 'P1',
    title_en: 'Login failed - invalid credentials',
    title_ar: 'فشل تسجيل الدخول - بيانات اعتماد غير صحيحة',
    category: 'Authentication',
    autoTicket: false,
    userFacing: true
  },
  'AUTH-API-SESSION-002': {
    code: 'AUTH-API-SESSION-002',
    module: 'AUTH',
    submodule: 'Session',
    severity: 'P1',
    title_en: 'Session expired - please login again',
    title_ar: 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مرة أخرى',
    category: 'Session',
    autoTicket: false,
    userFacing: true
  },

  // System Module
  'SYS-UI-RENDER-001': {
    code: 'SYS-UI-RENDER-001',
    module: 'SYS',
    submodule: 'Render',
    severity: 'P1',
    title_en: 'Page failed to render correctly',
    title_ar: 'فشل في عرض الصفحة بشكل صحيح',
    category: 'UI',
    autoTicket: true,
    userFacing: true
  },
  'SYS-API-NET-002': {
    code: 'SYS-API-NET-002',
    module: 'SYS',
    submodule: 'Network',
    severity: 'P2',
    title_en: 'Network request failed',
    title_ar: 'فشل في طلب الشبكة',
    category: 'Network',
    autoTicket: true,
    userFacing: true
  },
  'SYS-API-DB-003': {
    code: 'SYS-API-DB-003',
    module: 'SYS',
    submodule: 'Database',
    severity: 'P0',
    title_en: 'Database connection failed',
    title_ar: 'فشل في الاتصال بقاعدة البيانات',
    category: 'Database',
    autoTicket: true,
    userFacing: false
  },

  // Generic fallback
  'UI-UI-UNKNOWN-000': {
    code: 'UI-UI-UNKNOWN-000',
    module: 'UI',
    submodule: 'Unknown',
    severity: 'P2',
    title_en: 'An unexpected error occurred',
    title_ar: 'حدث خطأ غير متوقع',
    category: 'Unknown',
    autoTicket: true,
    userFacing: true
  }
};

export function getErrorInfo(code: string): ErrorRegistryItem {
  return ERROR_REGISTRY[code] || ERROR_REGISTRY['UI-UI-UNKNOWN-000'];
}

export function getErrorsByModule(module: string): ErrorRegistryItem[] {
  return Object.values(ERROR_REGISTRY).filter(item => item.module === module);
}

export function getErrorsBySeverity(severity: 'P0' | 'P1' | 'P2' | 'P3'): ErrorRegistryItem[] {
  return Object.values(ERROR_REGISTRY).filter(item => item.severity === severity);
}

export function getAutoTicketErrors(): ErrorRegistryItem[] {
  return Object.values(ERROR_REGISTRY).filter(item => item.autoTicket);
}