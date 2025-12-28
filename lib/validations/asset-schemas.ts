/**
 * Asset Validation Schemas
 *
 * @status IMPLEMENTED - Issue #152
 * @description Zod validation schemas for asset creation and updates
 *
 * Provides type-safe validation with detailed error messages.
 * Used by both frontend forms (react-hook-form) and backend API routes.
 */

import { z } from 'zod';
import {
  ASSET_TYPES,
  ASSET_STATUSES,
  ASSET_CRITICALITY_LEVELS,
  ASSET_DEFAULTS,
} from '@/lib/constants/asset-constants';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Location schema for asset placement
 */
export const AssetLocationSchema = z.object({
  building: z.string().min(1, 'Building is required').max(100, 'Building name too long'),
  floor: z.string().max(20, 'Floor identifier too long').optional(),
  room: z.string().max(50, 'Room identifier too long').optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).optional(),
});

/**
 * Technical specifications schema
 */
export const AssetSpecsSchema = z.object({
  capacity: z.string().max(100).optional(),
  powerRating: z.string().max(50).optional(),
  voltage: z.string().max(20).optional(),
  current: z.string().max(20).optional(),
  frequency: z.string().max(20).optional(),
  dimensions: z.string().max(100).optional(),
  weight: z.string().max(50).optional(),
}).optional();

/**
 * Warranty schema
 */
export const AssetWarrantySchema = z.object({
  period: z.number().int().min(0, 'Warranty period must be non-negative').max(120, 'Warranty period too long').optional(),
  expiry: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Invalid warranty expiry date' }
  ),
  terms: z.string().max(1000, 'Warranty terms too long').optional(),
});

/**
 * Purchase information schema
 */
export const AssetPurchaseSchema = z.object({
  date: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    },
    { message: 'Purchase date cannot be in the future' }
  ),
  cost: z.number()
    .min(0, 'Cost must be a positive number')
    .max(999999999.99, 'Cost exceeds maximum value')
    .optional()
    .transform((val) => val ?? 0),
  supplier: z.string().max(200, 'Supplier name too long').optional(),
  warranty: AssetWarrantySchema.optional(),
});

// ============================================================================
// CREATE ASSET SCHEMA
// ============================================================================

/**
 * Schema for creating a new asset
 */
export const CreateAssetSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name too long'),
  type: z.enum(ASSET_TYPES, {
    message: 'Invalid asset type',
  }),
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category name too long'),
  
  // Optional fields
  description: z.string().max(2000, 'Description too long').optional(),
  manufacturer: z.string().max(200, 'Manufacturer name too long').optional(),
  model: z.string().max(200, 'Model name too long').optional(),
  serialNumber: z.string()
    .max(100, 'Serial number too long')
    .optional()
    .refine(
      (val) => !val || /^[A-Za-z0-9\-_]+$/.test(val),
      { message: 'Serial number can only contain letters, numbers, hyphens, and underscores' }
    ),
  propertyId: z.string().min(1, 'Property is required'),
  
  // Nested objects
  location: AssetLocationSchema.optional(),
  specs: AssetSpecsSchema,
  purchase: AssetPurchaseSchema.optional(),
  
  // Status fields
  status: z.enum(ASSET_STATUSES).default('ACTIVE'),
  criticality: z.enum(ASSET_CRITICALITY_LEVELS).default('MEDIUM'),
  
  // Tags
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

// ============================================================================
// UPDATE ASSET SCHEMA
// ============================================================================

/**
 * Schema for updating an existing asset.
 * All fields are optional for partial updates.
 *
 * NOTE: We intentionally do NOT use `CreateAssetSchema.partial()` here because:
 * 1. Update operations have different validation rules (e.g., we don't require
 *    propertyId on update since it's already associated with the asset)
 * 2. Some fields have different constraints for updates vs creates
 * 3. This explicit definition is clearer and more maintainable
 */
export const UpdateAssetSchema = z.object({
  name: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name too long')
    .optional(),
  type: z.enum(ASSET_TYPES).optional(),
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category name too long')
    .optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  manufacturer: z.string().max(200, 'Manufacturer name too long').optional(),
  model: z.string().max(200, 'Model name too long').optional(),
  serialNumber: z.string()
    .max(100, 'Serial number too long')
    .optional()
    .refine(
      (val) => !val || /^[A-Za-z0-9\-_]+$/.test(val),
      { message: 'Serial number can only contain letters, numbers, hyphens, and underscores' }
    ),
  location: AssetLocationSchema.optional(),
  specs: AssetSpecsSchema,
  purchase: AssetPurchaseSchema.optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  criticality: z.enum(ASSET_CRITICALITY_LEVELS).optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

// ============================================================================
// FORM DEFAULT VALUES
// ============================================================================

/**
 * Default values for the create asset form.
 *
 * NOTE: `location` is intentionally omitted from defaults because it is optional
 * and the schema requires location.building to have min(1) length when provided.
 * Users must explicitly add location when needed.
 */
export const createAssetFormDefaults: Partial<CreateAssetInput> = {
  name: '',
  type: 'OTHER',
  category: '',
  description: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  propertyId: '',
  // location intentionally omitted - optional field with required building when provided
  specs: {
    capacity: '',
    powerRating: '',
    voltage: '',
    current: '',
    frequency: '',
    dimensions: '',
    weight: '',
  },
  purchase: {
    date: '',
    cost: 0,
    supplier: '',
    warranty: {
      period: ASSET_DEFAULTS.warrantyPeriodMonths,
      expiry: '',
      terms: '',
    },
  },
  status: 'ACTIVE',
  criticality: 'MEDIUM',
  tags: [],
};

