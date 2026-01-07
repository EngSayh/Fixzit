/**
 * Market Intelligence Types
 * @module types/market
 * @description Price indicators and market data for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Market Core Types
// Note: PropertyType renamed to avoid conflict with types/properties.ts
// Note: TransactionType renamed to MarketTransactionType to avoid conflict with wallet types
// ============================================================================

export type PropertyType = "apartment" | "villa" | "land" | "floor" | "building" | "office" | "shop" | "warehouse";
export type TransactionType = "sale" | "rent";
export type PeriodFilter = "monthly" | "3months" | "6months" | "yearly";

export interface ILocation {
  city: string;
  city_ar: string;
  district?: string;
  district_ar?: string;
  neighborhood?: string;
  neighborhood_ar?: string;
  lat?: number;
  lng?: number;
}

export interface IPriceDataPoint {
  period: string; // "H1 2025", "H2 2024", etc.
  period_start: Date;
  period_end: Date;
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  sample_size: number;
  price_change_pct?: number; // vs previous period
}

export interface IMarketIndicator {
  _id?: ObjectId | string;
  
  // Location
  city: string;
  city_ar: string;
  district?: string;
  district_ar?: string;
  neighborhood?: string;
  neighborhood_ar?: string;
  
  // Property Criteria
  property_type: PropertyType;
  transaction_type: TransactionType;
  rooms?: number; // null for land
  
  // Price Data (current period)
  period: string;
  period_start: Date;
  period_end: Date;
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  sample_size: number;
  price_change_pct: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// API Request/Response DTOs
// ============================================================================

export interface LocationsResponse {
  cities: Array<{
    id: string;
    name: string;
    name_ar: string;
  }>;
  districts: Array<{
    id: string;
    name: string;
    name_ar: string;
    city_id: string;
  }>;
  neighborhoods: Array<{
    id: string;
    name: string;
    name_ar: string;
    district_id: string;
  }>;
}

export interface MarketIndicatorsRequest {
  city: string;
  district?: string;
  neighborhood?: string;
  property_type: PropertyType;
  transaction_type: TransactionType;
  rooms?: number;
  period_filter?: PeriodFilter;
}

export interface MarketIndicatorsResponse {
  location: ILocation;
  criteria: {
    property_type: PropertyType;
    property_type_ar: string;
    transaction_type: TransactionType;
    transaction_type_ar: string;
    rooms?: number;
  };
  current: {
    average_price: number;
    median_price: number;
    min_price: number;
    max_price: number;
    sample_size: number;
    period: string;
  };
  price_history: IPriceDataPoint[];
  trend: {
    direction: "up" | "down" | "stable";
    change_pct: number;
    change_period: string;
  };
}

export interface MarketCompareRequest {
  locations: string[]; // JSON array of location IDs
  property_type: PropertyType;
  transaction_type: TransactionType;
  rooms?: number;
}

export interface MarketCompareResponse {
  comparisons: Array<{
    location: ILocation;
    current_avg: number;
    price_history: IPriceDataPoint[];
    trend_pct: number;
  }>;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface LocationSelectorProps {
  value: {
    city?: string;
    district?: string;
    neighborhood?: string;
  };
  onChange: (location: {
    city?: string;
    district?: string;
    neighborhood?: string;
  }) => void;
  locations: LocationsResponse;
  isLoading?: boolean;
  className?: string;
}

export interface PropertyTypeSelectorProps {
  value: PropertyType;
  onChange: (type: PropertyType) => void;
  showIcons?: boolean;
  className?: string;
}

export interface PriceChartProps {
  data: IPriceDataPoint[];
  title?: string;
  showLegend?: boolean;
  height?: number;
  className?: string;
}

export interface PriceTableProps {
  data: IPriceDataPoint[];
  showPercentChange?: boolean;
  className?: string;
}

export interface MarketIndicatorCardProps {
  location: ILocation;
  currentPrice: number;
  priceChange: number;
  propertyType: PropertyType;
  transactionType: TransactionType;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, {
  label: string;
  label_ar: string;
  icon: string;
}> = {
  apartment: {
    label: "Apartment",
    label_ar: "شقة",
    icon: "building",
  },
  villa: {
    label: "Villa",
    label_ar: "فيلا",
    icon: "home",
  },
  land: {
    label: "Land",
    label_ar: "أرض",
    icon: "map",
  },
  floor: {
    label: "Floor",
    label_ar: "دور",
    icon: "layers",
  },
  building: {
    label: "Building",
    label_ar: "عمارة",
    icon: "office-building",
  },
  office: {
    label: "Office",
    label_ar: "مكتب",
    icon: "briefcase",
  },
  shop: {
    label: "Shop",
    label_ar: "محل",
    icon: "shopping-bag",
  },
  warehouse: {
    label: "Warehouse",
    label_ar: "مستودع",
    icon: "cube",
  },
};

export const TRANSACTION_TYPE_CONFIG: Record<TransactionType, {
  label: string;
  label_ar: string;
}> = {
  sale: {
    label: "For Sale",
    label_ar: "للبيع",
  },
  rent: {
    label: "For Rent",
    label_ar: "للإيجار",
  },
};

export const PERIOD_FILTER_CONFIG: Record<PeriodFilter, {
  label: string;
  label_ar: string;
  months: number;
}> = {
  monthly: {
    label: "Monthly",
    label_ar: "شهري",
    months: 1,
  },
  "3months": {
    label: "3 Months",
    label_ar: "3 أشهر",
    months: 3,
  },
  "6months": {
    label: "6 Months",
    label_ar: "6 أشهر",
    months: 6,
  },
  yearly: {
    label: "Yearly",
    label_ar: "سنوي",
    months: 12,
  },
};

// Sample Saudi cities for market data
export const SAUDI_CITIES = [
  { id: "riyadh", name: "Riyadh", name_ar: "الرياض" },
  { id: "jeddah", name: "Jeddah", name_ar: "جدة" },
  { id: "mecca", name: "Mecca", name_ar: "مكة المكرمة" },
  { id: "medina", name: "Medina", name_ar: "المدينة المنورة" },
  { id: "dammam", name: "Dammam", name_ar: "الدمام" },
  { id: "khobar", name: "Khobar", name_ar: "الخبر" },
  { id: "dhahran", name: "Dhahran", name_ar: "الظهران" },
  { id: "tabuk", name: "Tabuk", name_ar: "تبوك" },
  { id: "abha", name: "Abha", name_ar: "أبها" },
  { id: "khamis_mushait", name: "Khamis Mushait", name_ar: "خميس مشيط" },
];
