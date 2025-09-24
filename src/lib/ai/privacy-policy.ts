// src/lib/ai/privacy-policy.ts - AI Assistant Privacy Policy Implementation

export const AI_PRIVACY_POLICY = {
  version: '1.0',
  lastUpdated: '2025-01-01',
  
  // What the AI can share
  allowed: {
    userOwnData: [
      'User\'s own tickets, work orders, and requests',
      'Properties and units assigned to or owned by the user',
      'User\'s own financial statements (owners only)',
      'General system guidance and help',
      'Module navigation based on user role'
    ],
    
    publicInfo: [
      'General Fixzit platform features',
      'How-to guides for allowed modules',
      'System status and announcements',
      'Common troubleshooting steps'
    ]
  },
  
  // What the AI must never share
  prohibited: {
    crossTenant: [
      'Any data from other organizations',
      'Other tenants\' properties or work orders',
      'Cross-organization financial data',
      'Other companies\' user information'
    ],
    
    sensitive: [
      'Other users\' personal information (PII)',
      'System passwords or API keys',
      'Internal configuration details',
      'Detailed financial data without permission',
      'HR/Payroll data without HR role'
    ],
    
    bulk: [
      'Mass data exports',
      'Unrestricted database queries',
      'Complete user lists',
      'All properties without filters'
    ]
  },
  
  // Role-based data access
  roleAccess: {
    SUPER_ADMIN: ['ALL_DATA', 'SYSTEM_CONFIG', 'CROSS_TENANT_READONLY'],
    CORP_ADMIN: ['TENANT_ALL_DATA', 'FINANCE', 'HR', 'REPORTS'],
    MANAGEMENT: ['TENANT_ALL_DATA', 'FINANCE_LIMITED', 'REPORTS'],
    FINANCE: ['TENANT_FINANCE', 'OWNER_STATEMENTS', 'INVOICES'],
    HR: ['TENANT_HR', 'EMPLOYEE_DATA', 'PAYROLL'],
    PROPERTY_OWNER: ['OWN_PROPERTIES', 'OWN_STATEMENTS', 'OWN_TICKETS'],
    TENANT: ['OWN_UNIT', 'OWN_TICKETS', 'MARKETPLACE_BROWSE'],
    TECHNICIAN: ['ASSIGNED_TICKETS', 'PROPERTY_ACCESS_LIMITED'],
    VENDOR: ['OWN_PRODUCTS', 'ASSIGNED_ORDERS', 'MARKETPLACE_VENDOR'],
    GUEST: ['PUBLIC_INFO', 'MARKETPLACE_BROWSE']
  },
  
  // Data classification
  dataClasses: {
    PUBLIC: {
      description: 'General information available to all users',
      examples: ['Platform features', 'Help guides', 'Public marketplace listings']
    },
    
    TENANT_SCOPED: {
      description: 'Data within the user\'s organization',
      examples: ['Work orders', 'Properties', 'Internal announcements']
    },
    
    OWNER_SCOPED: {
      description: 'Data specific to property owners',
      examples: ['Financial statements', 'Rental income', 'Property performance']
    },
    
    USER_SCOPED: {
      description: 'Data specific to the individual user',
      examples: ['Personal tickets', 'Assigned tasks', 'Profile information']
    },
    
    SENSITIVE: {
      description: 'Highly restricted data',
      examples: ['Financial details', 'HR records', 'System credentials']
    }
  },
  
  // Enforcement mechanisms
  enforcement: {
    preChecks: [
      'Verify user session and organization',
      'Check role permissions',
      'Validate data scope',
      'Apply tenant isolation'
    ],
    
    runtime: [
      'Filter all queries by orgId',
      'Mask PII in responses',
      'Limit result sets',
      'Redact sensitive fields'
    ],
    
    postChecks: [
      'Audit log all data access',
      'Monitor for anomalies',
      'Review denied requests',
      'Update security rules'
    ]
  },
  
  // Audit requirements
  audit: {
    required: [
      'User ID and role',
      'Organization ID',
      'Timestamp',
      'Request intent',
      'Data accessed',
      'Action taken',
      'Denial reason (if applicable)'
    ],
    
    retention: '90 days',
    storage: 'ai_audit_logs collection'
  }
};

// Privacy enforcement functions
export function classifyDataRequest(message: string, userRole: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for sensitive data requests
  if (lowerMessage.includes('password') || 
      lowerMessage.includes('api key') || 
      lowerMessage.includes('secret')) {
    return 'SENSITIVE';
  }
  
  // Check for cross-tenant requests
  if (lowerMessage.includes('other tenant') || 
      lowerMessage.includes('different company') ||
      lowerMessage.includes('all users') ||
      lowerMessage.includes('everyone')) {
    return 'CROSS_TENANT';
  }
  
  // Check for financial data
  if (lowerMessage.includes('financial') || 
      lowerMessage.includes('statement') ||
      lowerMessage.includes('revenue') ||
      lowerMessage.includes('income')) {
    return 'OWNER_SCOPED';
  }
  
  // Check for HR data
  if (lowerMessage.includes('salary') || 
      lowerMessage.includes('payroll') ||
      lowerMessage.includes('employee')) {
    return 'HR_SCOPED';
  }
  
  // Default classifications based on content
  if (lowerMessage.includes('my ') || lowerMessage.includes('mine')) {
    return 'USER_SCOPED';
  }
  
  if (lowerMessage.includes('help') || 
      lowerMessage.includes('how') ||
      lowerMessage.includes('guide')) {
    return 'PUBLIC';
  }
  
  return 'TENANT_SCOPED';
}

export function canAccessDataClass(userRole: string, dataClass: string): boolean {
  const roleAccess = AI_PRIVACY_POLICY.roleAccess[userRole as keyof typeof AI_PRIVACY_POLICY.roleAccess] || [];
  
  switch (dataClass) {
    case 'PUBLIC':
      return true;
      
    case 'USER_SCOPED':
      return true; // All users can access their own data
      
    case 'TENANT_SCOPED':
      return !roleAccess.includes('GUEST');
      
    case 'OWNER_SCOPED':
      return roleAccess.includes('OWN_PROPERTIES') || 
             roleAccess.includes('TENANT_FINANCE') ||
             roleAccess.includes('TENANT_ALL_DATA');
             
    case 'HR_SCOPED':
      return roleAccess.includes('TENANT_HR') || 
             roleAccess.includes('TENANT_ALL_DATA');
             
    case 'SENSITIVE':
      return roleAccess.includes('ALL_DATA') || 
             roleAccess.includes('SYSTEM_CONFIG');
             
    case 'CROSS_TENANT':
      return roleAccess.includes('CROSS_TENANT_READONLY');
      
    default:
      return false;
  }
}

export function redactPII(text: string): string {
  // Email addresses
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  
  // Phone numbers
  text = text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  
  // Saudi National ID pattern
  text = text.replace(/\b[12]\d{9}\b/g, '[ID_REDACTED]');
  
  // Credit card patterns
  text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');
  
  // API keys and tokens (common patterns)
  text = text.replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN_REDACTED]');
  
  return text;
}

export function generatePrivacyResponse(dataClass: string, userRole: string, locale: string = 'en'): string {
  if (canAccessDataClass(userRole, dataClass)) {
    return ''; // No privacy message needed
  }
  
  const messages = {
    en: {
      CROSS_TENANT: 'I cannot share information about other organizations to protect data privacy.',
      SENSITIVE: 'I cannot share sensitive system information for security reasons.',
      OWNER_SCOPED: 'You need property owner or finance permissions to access financial statements.',
      HR_SCOPED: 'You need HR permissions to access employee and payroll information.',
      DEFAULT: 'You do not have permission to access this information.'
    },
    ar: {
      CROSS_TENANT: 'لا يمكنني مشاركة معلومات عن منظمات أخرى لحماية خصوصية البيانات.',
      SENSITIVE: 'لا يمكنني مشاركة معلومات النظام الحساسة لأسباب أمنية.',
      OWNER_SCOPED: 'تحتاج إلى صلاحيات مالك العقار أو المالية للوصول إلى البيانات المالية.',
      HR_SCOPED: 'تحتاج إلى صلاحيات الموارد البشرية للوصول إلى معلومات الموظفين والرواتب.',
      DEFAULT: 'ليس لديك صلاحية للوصول إلى هذه المعلومات.'
    }
  };
  
  const langMessages = messages[locale as keyof typeof messages] || messages.en;
  return langMessages[dataClass as keyof typeof langMessages] || langMessages.DEFAULT;
}
