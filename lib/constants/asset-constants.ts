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

/** Supported asset types used across UI and API. */
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

/** Asset type union derived from ASSET_TYPES. */
export type AssetType = (typeof ASSET_TYPES)[number];

/** Bilingual label with i18n key for asset pickers. */
export type AssetLabel = {
  en: string;
  ar: string;
  tKey: string;
};

/** Labels for asset types with fm.assets translation keys. */
export const ASSET_TYPE_LABELS: Record<AssetType, AssetLabel> = {
  HVAC: { en: 'HVAC', ar: 'تكييف وتبريد', tKey: 'assetType.HVAC' },
  ELECTRICAL: { en: 'Electrical', ar: 'كهربائي', tKey: 'assetType.ELECTRICAL' },
  PLUMBING: { en: 'Plumbing', ar: 'سباكة', tKey: 'assetType.PLUMBING' },
  SECURITY: { en: 'Security', ar: 'أمن', tKey: 'assetType.SECURITY' },
  ELEVATOR: { en: 'Elevator', ar: 'مصعد', tKey: 'assetType.ELEVATOR' },
  GENERATOR: { en: 'Generator', ar: 'مولد', tKey: 'assetType.GENERATOR' },
  FIRE_SYSTEM: { en: 'Fire System', ar: 'نظام إطفاء', tKey: 'assetType.FIRE_SYSTEM' },
  IT_EQUIPMENT: { en: 'IT Equipment', ar: 'معدات تقنية', tKey: 'assetType.IT_EQUIPMENT' },
  VEHICLE: { en: 'Vehicle', ar: 'مركبة', tKey: 'assetType.VEHICLE' },
  OTHER: { en: 'Other', ar: 'أخرى', tKey: 'assetType.OTHER' },
};

// ============================================================================
// ASSET STATUSES
// ============================================================================

/** Supported asset lifecycle statuses. */
export const ASSET_STATUSES = [
  'ACTIVE',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
  'DECOMMISSIONED',
] as const;

/** Asset status union derived from ASSET_STATUSES. */
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Labels for asset statuses with fm.assets translation keys. */
export const ASSET_STATUS_LABELS: Record<AssetStatus, AssetLabel> = {
  ACTIVE: { en: 'Active', ar: 'نشط', tKey: 'status.ACTIVE' },
  MAINTENANCE: { en: 'Maintenance', ar: 'صيانة', tKey: 'status.MAINTENANCE' },
  OUT_OF_SERVICE: { en: 'Out of Service', ar: 'خارج الخدمة', tKey: 'status.OUT_OF_SERVICE' },
  DECOMMISSIONED: { en: 'Decommissioned', ar: 'مسحوب', tKey: 'status.DECOMMISSIONED' },
};

// ============================================================================
// ASSET CRITICALITY LEVELS
// ============================================================================

/** Supported asset criticality levels. */
export const ASSET_CRITICALITY_LEVELS = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

/** Asset criticality union derived from ASSET_CRITICALITY_LEVELS. */
export type AssetCriticality = (typeof ASSET_CRITICALITY_LEVELS)[number];

/** Labels for asset criticality with fm.assets translation keys. */
export const ASSET_CRITICALITY_LABELS: Record<AssetCriticality, AssetLabel> = {
  LOW: { en: 'Low', ar: 'منخفض', tKey: 'criticality.LOW' },
  MEDIUM: { en: 'Medium', ar: 'متوسط', tKey: 'criticality.MEDIUM' },
  HIGH: { en: 'High', ar: 'عالي', tKey: 'criticality.HIGH' },
  CRITICAL: { en: 'Critical', ar: 'حرج', tKey: 'criticality.CRITICAL' },
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default values for asset creation with Saudi Arabia coordinates. */
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
