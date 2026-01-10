/**
 * @fileoverview Shared Common Types for Mobile
 * @module mobile/shared-types/common
 */

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Paginated request
 */
export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Geolocation
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: string;
}

/**
 * Address
 */
export interface Address {
  street: string;
  building?: string;
  floor?: string;
  unit?: string;
  city: string;
  district?: string;
  postalCode?: string;
  country: string;
  coordinates?: GeoLocation;
}

/**
 * Property summary for lists
 */
export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  imageUrl?: string;
  unitsCount?: number;
}

/**
 * Property types
 */
export type PropertyType =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "MIXED"
  | "INDUSTRIAL"
  | "LAND";

/**
 * Unit summary for lists
 */
export interface UnitSummary {
  id: string;
  propertyId: string;
  number: string;
  type: UnitType;
  status: UnitStatus;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: "sqm" | "sqft";
}

/**
 * Unit types
 */
export type UnitType =
  | "APARTMENT"
  | "VILLA"
  | "STUDIO"
  | "OFFICE"
  | "SHOP"
  | "WAREHOUSE"
  | "OTHER";

/**
 * Unit status
 */
export type UnitStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "MAINTENANCE"
  | "RESERVED";

/**
 * Attachment/file
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  createdAt: string;
}

/**
 * Photo with metadata
 */
export interface Photo extends Attachment {
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  caption?: string;
  location?: GeoLocation;
}

/**
 * Currency amount
 */
export interface MoneyAmount {
  amount: number;
  currency: string;
  formatted?: string;
}

/**
 * Date range
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

/**
 * Notification types
 */
export type NotificationType =
  | "WORK_ORDER_CREATED"
  | "WORK_ORDER_ASSIGNED"
  | "WORK_ORDER_UPDATED"
  | "WORK_ORDER_COMPLETED"
  | "PAYMENT_DUE"
  | "PAYMENT_RECEIVED"
  | "LEASE_EXPIRING"
  | "MAINTENANCE_SCHEDULED"
  | "GENERAL";

/**
 * App configuration
 */
export interface AppConfig {
  apiBaseUrl: string;
  environment: "development" | "staging" | "production";
  version: string;
  buildNumber: number;
  features: FeatureFlags;
  supportedLocales: string[];
  defaultLocale: string;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  offlineMode: boolean;
  biometricAuth: boolean;
  darkMode: boolean;
  pushNotifications: boolean;
  geoTracking: boolean;
  photoCapture: boolean;
  voiceNotes: boolean;
}

/**
 * Device info
 */
export interface DeviceInfo {
  platform: "ios" | "android";
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  deviceId?: string;
  pushToken?: string;
  locale: string;
  timezone: string;
}

/**
 * Sync status
 */
export interface SyncStatus {
  lastSyncAt?: string;
  pendingUploads: number;
  pendingDownloads: number;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Generic filter options
 */
export interface FilterOptions {
  search?: string;
  status?: string[];
  dateRange?: DateRange;
  propertyIds?: string[];
  unitIds?: string[];
}

/**
 * Sort option
 */
export interface SortOption {
  field: string;
  order: "asc" | "desc";
  label: string;
}

/**
 * List state (for infinite scroll/pagination)
 */
export interface ListState<T> {
  items: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error?: string;
  page: number;
  total: number;
}
