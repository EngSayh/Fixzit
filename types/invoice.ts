export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: {
    type?: string;
    rate?: number;
    amount?: number;
  };
  total: number;
}

export interface InvoiceRecipient {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  customerId?: string;
}

export interface InvoiceZatcaInfo {
  status?: string;
  qrCode?: string;
}

export interface InvoicePayment {
  date?: string | Date;
  reference?: string;
  amount?: number;
}

export interface Invoice {
  id?: string;
  _id?: string;
  tenantId?: string;
  orgId?: string;
  invoiceNumber?: string;
  number?: string;
  orderId?: string;
  workOrderId?: string;
  customerRef?: string;
  recipient?: InvoiceRecipient;
  issueDate?: string | Date;
  dueDate?: string | Date;
  lines?: InvoiceLine[];
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  currency: string;
  status?: string;
  zatca?: InvoiceZatcaInfo;
  payments?: InvoicePayment[];
  type?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED"
  | string;

export default Invoice;
