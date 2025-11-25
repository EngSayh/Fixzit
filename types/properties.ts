import type { WorkOrderPriority, WorkOrderStatus } from "./work-orders";

export type PropertyType =
  | "residential"
  | "commercial"
  | "mixed"
  | "industrial"
  | "hospitality"
  | "retail";

export type PropertyStatus =
  | "active"
  | "maintenance"
  | "vacant"
  | "archived"
  | "under_construction"
  | "planned";

export type UnitStatus =
  | "occupied"
  | "vacant"
  | "reserved"
  | "maintenance"
  | "under_renovation"
  | "offline";

export type TenantStatus = "active" | "inactive" | "delinquent" | "prospect";

export interface PropertyWorkOrderSummary {
  id: string;
  title?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  category?: string;
  dueDate?: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  rentAmount: number;
  status: UnitStatus;
  rentCurrency?: string;
  floor?: string | number;
  isLeaseExpiring?: boolean;
  leaseExpiryDate?: string;
  daysUntilExpiry?: number;
  amenities?: string[];
  features?: string[];
  notes?: string;
  currentTenantId?: string;
  currentTenant?: Tenant;
  orgId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  moveInDate?: string;
  moveOutDate?: string;
  status: TenantStatus;
  orgId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  currentUnit?: Unit;
  totalPayments?: number;
  outstandingBalance?: number;
  avgRating?: number;
  notes?: string;
}

export type DocumentCategory =
  | "lease"
  | "insurance"
  | "maintenance"
  | "compliance"
  | "financial"
  | "inspection"
  | "floorplan"
  | "photo"
  | "legal"
  | "other";

export interface PropertyDocument {
  id: string;
  propertyId: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  category: DocumentCategory;
  description?: string;
  version?: string;
  tags?: string[];
  uploadedBy?: string;
  uploadedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  isPublic?: boolean;
  orgId?: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  rentFrequency?: "monthly" | "quarterly" | "yearly";
  depositAmount?: number;
  status: "draft" | "active" | "pending" | "terminated" | "expired";
  noticePeriodDays?: number;
  isAutoRenew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  type: PropertyType;
  status?: PropertyStatus;
  description?: string;
  amenities?: string[];
  tags?: string[];
  images?: string[];
  totalUnits?: number;
  occupiedUnits?: number;
  vacantUnits?: number;
  occupancyRate?: number;
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  maintenanceCosts?: number;
  monthlyExpenses?: number;
  netIncome?: number;
  expiringLeases?: number;
  squareFootage?: number;
  yearBuilt?: number | string;
  parkingSpaces?: number;
  complianceStatus?: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  rating?: number;
  workOrders?: PropertyWorkOrderSummary[];
  units?: Unit[];
  tenants?: Tenant[];
  documents?: PropertyDocument[];
  leases?: Lease[];
  managerId?: string;
  managerName?: string;
  orgId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  overallOccupancyRate: number;
  totalMonthlyRevenue: number;
  averageRentPerUnit: number;
  maintenanceCosts: number;
  netIncome: number;
  emergencyWorkOrders?: number;
  openWorkOrders?: number;
}

export interface PropertyFilters {
  search?: string;
  type?: PropertyType[];
  status?: UnitStatus[];
  occupancyRange?: [number, number];
  revenueRange?: [number, number];
  location?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  amenities?: string[];
  managerId?: string;
  minUnits?: number;
  maxUnits?: number;
  tags?: string[];
}

export const PROPERTY_TYPE_CONFIG: Record<
  PropertyType,
  { label: string; icon: string; color: string; description: string }
> = {
  residential: {
    label: "Residential",
    icon: "🏠",
    color: "bg-blue-100 text-blue-800",
    description: "Apartments, villas, and multi-family properties",
  },
  commercial: {
    label: "Commercial",
    icon: "🏢",
    color: "bg-purple-100 text-purple-800",
    description: "Office towers, retail centers, and business parks",
  },
  mixed: {
    label: "Mixed Use",
    icon: "🏙️",
    color: "bg-indigo-100 text-indigo-800",
    description: "Properties with combined residential and commercial units",
  },
  industrial: {
    label: "Industrial",
    icon: "🏭",
    color: "bg-orange-100 text-orange-800",
    description: "Warehouses, logistics hubs, and manufacturing facilities",
  },
  hospitality: {
    label: "Hospitality",
    icon: "🏨",
    color: "bg-emerald-100 text-emerald-800",
    description: "Hotels, serviced apartments, and resorts",
  },
  retail: {
    label: "Retail",
    icon: "🛍️",
    color: "bg-pink-100 text-pink-800",
    description: "Shopping malls, souqs, and standalone retail stores",
  },
};

export const UNIT_STATUS_CONFIG: Record<
  UnitStatus,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  occupied: {
    label: "Occupied",
    icon: "✅",
    color: "text-green-800",
    bgColor: "bg-green-100",
    description: "Currently leased and occupied",
  },
  vacant: {
    label: "Vacant",
    icon: "🟦",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    description: "Available and ready for leasing",
  },
  reserved: {
    label: "Reserved",
    icon: "📌",
    color: "text-amber-800",
    bgColor: "bg-amber-100",
    description: "On hold for an incoming tenant",
  },
  maintenance: {
    label: "Maintenance",
    icon: "🛠️",
    color: "text-red-800",
    bgColor: "bg-red-100",
    description: "Temporarily unavailable due to maintenance",
  },
  under_renovation: {
    label: "Renovation",
    icon: "🚧",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    description: "Undergoing upgrades or refurbishment",
  },
  offline: {
    label: "Offline",
    icon: "⏸️",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "Temporarily offline or not rentable",
  },
};

export const TENANT_STATUS_CONFIG: Record<
  TenantStatus,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  active: {
    label: "Active",
    icon: "🟢",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100",
    description: "Currently occupying a unit and in good standing",
  },
  inactive: {
    label: "Inactive",
    icon: "⚪",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "No longer occupying a unit",
  },
  delinquent: {
    label: "Delinquent",
    icon: "⚠️",
    color: "text-red-800",
    bgColor: "bg-red-100",
    description: "Outstanding balance requires attention",
  },
  prospect: {
    label: "Prospect",
    icon: "📝",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    description: "Lead or application in progress",
  },
};

export const DOCUMENT_CATEGORY_CONFIG: Record<
  DocumentCategory,
  { label: string; icon: string }
> = {
  lease: { label: "Lease Agreements", icon: "📄" },
  insurance: { label: "Insurance Policies", icon: "🛡️" },
  maintenance: { label: "Maintenance Reports", icon: "🛠️" },
  compliance: { label: "Compliance Certificates", icon: "✅" },
  financial: { label: "Financial Records", icon: "💰" },
  inspection: { label: "Inspection Reports", icon: "📋" },
  floorplan: { label: "Floor Plans", icon: "📐" },
  photo: { label: "Photos & Media", icon: "📸" },
  legal: { label: "Legal Documents", icon: "⚖️" },
  other: { label: "Other Documents", icon: "🗂️" },
};

export const VIEW_MODES = ["grid", "table", "map"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const PROPERTY_SORT_OPTIONS = [
  { value: "created_at", label: "Recently Added" },
  { value: "name", label: "Name (A-Z)" },
  { value: "occupancy", label: "Occupancy Rate" },
  { value: "revenue", label: "Monthly Revenue" },
  { value: "units", label: "Number of Units" },
  { value: "status", label: "Status" },
] as const;

export type PropertySortOption =
  (typeof PROPERTY_SORT_OPTIONS)[number]["value"];
