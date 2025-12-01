// MongoDB Models with TypeScript interfaces
import type { ObjectId } from "mongodb";

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

export interface WorkOrder {
  _id?: string;
  tenantId: string;
  code: string;
  title: string;
  description: string;
  status: WOStatus;
  priority: WOPriority;
  propertyId?: string;
  requesterId?: string;
  assigneeId?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  slaHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum WOStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum WOPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

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

export interface Invoice {
  _id?: string;
  tenantId: string;
  invoiceNumber: string;
  orderId?: string;
  workOrderId?: string;
  customerRef: string;
  issueDate: Date;
  dueDate: Date;
  lines: InvoiceLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  zatcaQr?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

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
