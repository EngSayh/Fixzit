/**
 * Asset Constants
 *
 * @status IMPLEMENTED - Issue #152
 * @description Centralized constants for asset management
 *
 * Provides type-safe enums and constants for assets across frontend and backend.
 * Ensures consistency between form options, API validation, and database values.
 */

// ============================================================================
// ASSET TYPES
// ============================================================================

export const ASSET_TYPES = [
  'HVAC',
  'ELECTRICAL',
  'PLUMBING',
  'SECURITY',
  'ELEVATOR',
  'GENERATOR',
  'FIRE_SYSTEM',
  'IT_EQUIPMENT',
  'VEHICLE',
  'OTHER',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, { en: string; ar: string }> = {
  HVAC: { en: 'HVAC', ar: 'تكييف وتبريد' },
  ELECTRICAL: { en: 'Electrical', ar: 'كهربائي' },
  PLUMBING: { en: 'Plumbing', ar: 'سباكة' },
  SECURITY: { en: 'Security', ar: 'أمن' },
  ELEVATOR: { en: 'Elevator', ar: 'مصعد' },
  GENERATOR: { en: 'Generator', ar: 'مولد' },
  FIRE_SYSTEM: { en: 'Fire System', ar: 'نظام إطفاء' },
  IT_EQUIPMENT: { en: 'IT Equipment', ar: 'معدات تقنية' },
  VEHICLE: { en: 'Vehicle', ar: 'مركبة' },
  OTHER: { en: 'Other', ar: 'أخرى' },
};

// ============================================================================
// ASSET STATUSES
// ============================================================================

export const ASSET_STATUSES = [
  'ACTIVE',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
  'DECOMMISSIONED',
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, { en: string; ar: string }> = {
  ACTIVE: { en: 'Active', ar: 'نشط' },
  MAINTENANCE: { en: 'Maintenance', ar: 'صيانة' },
  OUT_OF_SERVICE: { en: 'Out of Service', ar: 'خارج الخدمة' },
  DECOMMISSIONED: { en: 'Decommissioned', ar: 'مسحوب' },
};

// ============================================================================
// ASSET CRITICALITY LEVELS
// ============================================================================

export const ASSET_CRITICALITY_LEVELS = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export type AssetCriticality = (typeof ASSET_CRITICALITY_LEVELS)[number];

export const ASSET_CRITICALITY_LABELS: Record<AssetCriticality, { en: string; ar: string }> = {
  LOW: { en: 'Low', ar: 'منخفض' },
  MEDIUM: { en: 'Medium', ar: 'متوسط' },
  HIGH: { en: 'High', ar: 'عالي' },
  CRITICAL: { en: 'Critical', ar: 'حرج' },
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const ASSET_DEFAULTS = {
  status: 'ACTIVE' as AssetStatus,
  criticality: 'MEDIUM' as AssetCriticality,
  warrantyPeriodMonths: 12,
  defaultCoordinates: {
    lat: 24.7136, // Riyadh
    lng: 46.6753,
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_CRITICALITY_LEVELS,
  ASSET_CRITICALITY_LABELS,
  ASSET_DEFAULTS,
};
