// MongoDB Models with TypeScript interfaces
import type { ObjectId } from "mongodb";
import type { WorkOrder as FMWorkOrder } from "@/types/fm/work-order";
export { WOStatus, WOPriority } from "@/types/fm/work-order";

/**
 * @deprecated Import Role from '@/domain/fm/fm-lite' instead.
 * This re-export maintains backward compatibility with existing imports.
 * The canonical Role enum is defined in domain/fm/fm-lite.ts (client-safe).
 * 
 * CRITICAL: Do NOT import from fm.behavior.ts here - it contains Mongoose schemas
 * that will leak into client bundles and cause "Invalid schema configuration" errors.
 */
export { Role } from "@/domain/fm/fm-lite";

export interface Tenant {
  _id?: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id?: string;
  tenantId: string;
  email: string;
  password: string;
  name: string;
  role: import("@/domain/fm/fm-lite").Role;
  phone?: string;
  locale?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  _id?: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  lat?: number;
  lng?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkOrder = Pick<
  FMWorkOrder,
  | "_id"
  | "tenantId"
  | "code"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "propertyId"
  | "requesterId"
  | "assigneeId"
  | "scheduledAt"
  | "startedAt"
  | "completedAt"
  | "slaHours"
  | "createdAt"
  | "updatedAt"
>;

// Marketplace Models
export interface Category {
  _id?: string;
  name: string;
  slug: string;
  parentId?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  _id?: string;
  tenantId: string;
  userId: string;
  name: string;
  crNumber?: string;
  vatNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  rating: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  _id?: string;
  tenantId: string;
  vendorId: string;
  categoryId: string;
  sku: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  unit: string;
  stock: number;
  rating: number;
  reviewCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  _id?: string;
  userId: string;
  tenantId: string;
  items: CartItem[];
  currency: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  _id?: string;
  tenantId: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentRef?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export type InvoiceStatus = import("@/types/invoice").InvoiceStatus;

export type Invoice = Pick<
  import("@/types/invoice").Invoice,
  | "_id"
  | "tenantId"
  | "invoiceNumber"
  | "orderId"
  | "workOrderId"
  | "customerRef"
  | "issueDate"
  | "dueDate"
  | "subtotal"
  | "vatRate"
  | "vatAmount"
  | "total"
  | "currency"
  | "status"
  | "zatca"
  | "createdAt"
  | "updatedAt"
> & {
  lines: InvoiceLine[];
};

export type InvoiceLine = Pick<
  import("@/types/invoice").InvoiceLine,
  "description" | "quantity" | "unitPrice" | "total" | "tax" | "discount"
>;

// Marketplace - RFQ

export interface RFQ {
  _id?: string;
  tenantId: string;
  requesterId: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  deadline: Date;
  status: RFQStatus;
  bids: Bid[];
  selectedBidId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bid {
  _id?: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  deliveryDays: number;
  notes?: string;
  attachments?: string[];
  submittedAt: Date;
}

export enum RFQStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  AWARDED = "AWARDED",
  CANCELLED = "CANCELLED",
}

export interface Review {
  _id?: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  helpful: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDoc {
  id?: ObjectId | string;
  orgId: string;
  type: "work-order" | "vendor" | "payment" | "maintenance" | "system" | string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
  category: "maintenance" | "vendor" | "finance" | "system" | string;
  archived?: boolean;
  targetUrl?: string; // Optional deep link for notification
}
