export type Severity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type ModuleKey = 
  | 'Dashboard' | 'Work Orders' | 'Properties' | 'Finance' | 'HR'
  | 'Administration' | 'CRM' | 'Marketplace' | 'Support' | 'Compliance'
  | 'Reports' | 'System' | 'Aqar' | 'Souq' | 'Account' | 'Billing';

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Array<{ path?: string; message: string }>;
  traceId?: string;
  correlationId?: string;
}

export interface ErrorItem {
  code: string;
  message: string;
  stack?: string;
  httpStatus?: number;
  category?: string;
  severity: Severity;
  module: ModuleKey;
  timestamp: string;
}

export interface ErrorReport {
  incidentId: string;
  correlationId?: string;
  orgId?: string;
  userId?: string;
  userRole?: string;
  locale?: string;
  rtl?: boolean;
  route?: string;
  module?: ModuleKey;
  severity: Severity;
  items: ErrorItem[];
  device?: {
    ua?: string;
    platform?: string;
    width?: number;
    height?: number;
    online?: boolean;
  };
  network?: {
    status?: number;
    offline?: boolean;
  };
  payloadHash?: string;
  createdAt: string;
  tags?: string[];
  ticketId?: string;
}

export interface ErrorRegistryItem {
  code: string;
  module: string;
  submodule: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  title_en: string;
  title_ar: string;
  category: string;
  autoTicket: boolean;
  userFacing: boolean;
}

export interface ToastError {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  incidentId: string;
  code: string;
  module: ModuleKey;
  timestamp: string;
  actions: {
    copy: boolean;
    report: boolean;
    retry?: boolean;
  };
}