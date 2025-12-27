/**
 * Asset Validation Schema Tests
 *
 * @status IMPLEMENTED - Issue #152
 */

import { describe, it, expect } from 'vitest';
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  AssetLocationSchema,
  AssetPurchaseSchema,
  createAssetFormDefaults,
} from '@/lib/validations/asset-schemas';

describe('CreateAssetSchema', () => {
  describe('required fields', () => {
    it('should require name', () => {
      const result = CreateAssetSchema.safeParse({
        ...createAssetFormDefaults,
        name: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
      }
    });

    it('should require type', () => {
      const result = CreateAssetSchema.safeParse({
        ...createAssetFormDefaults,
        name: 'Test Asset',
        type: undefined,
      });
      expect(result.success).toBe(false);
    });

    it('should require category', () => {
      const result = CreateAssetSchema.safeParse({
        ...createAssetFormDefaults,
        name: 'Test Asset',
        category: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('category'))).toBe(true);
      }
    });
  });

  describe('valid asset creation', () => {
    it('should accept valid minimal asset', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Chiller Unit 1',
        type: 'HVAC',
        category: 'Cooling Equipment',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('ACTIVE'); // default
        expect(result.data.criticality).toBe('MEDIUM'); // default
      }
    });

    it('should accept valid full asset', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Main Generator',
        type: 'GENERATOR',
        category: 'Power Supply',
        description: 'Primary backup power generator',
        manufacturer: 'Caterpillar',
        model: 'CAT 500',
        serialNumber: 'CAT-500-2024-001',
        status: 'ACTIVE',
        criticality: 'CRITICAL',
        location: {
          building: 'Building A',
          floor: '1',
          room: 'Generator Room',
        },
        purchase: {
          date: '2024-01-15',
          cost: 150000,
          supplier: 'Industrial Suppliers Ltd',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('asset type validation', () => {
    it('should accept all valid asset types', () => {
      const types = ['HVAC', 'ELECTRICAL', 'PLUMBING', 'SECURITY', 'ELEVATOR', 'GENERATOR', 'FIRE_SYSTEM', 'IT_EQUIPMENT', 'VEHICLE', 'OTHER'];
      types.forEach((type) => {
        const result = CreateAssetSchema.safeParse({
          name: 'Test',
          type,
          category: 'Test Category',
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid asset type', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Test',
        type: 'INVALID_TYPE',
        category: 'Test Category',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('serial number validation', () => {
    it('should accept valid serial numbers', () => {
      const validSerials = ['ABC123', 'ABC-123', 'ABC_123', 'ABC123XYZ'];
      validSerials.forEach((serialNumber) => {
        const result = CreateAssetSchema.safeParse({
          name: 'Test',
          type: 'OTHER',
          category: 'Test',
          serialNumber,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid serial numbers with special characters', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Test',
        type: 'OTHER',
        category: 'Test',
        serialNumber: 'ABC@123#$%',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('status and criticality defaults', () => {
    it('should default status to ACTIVE', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Test',
        type: 'HVAC',
        category: 'Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('ACTIVE');
      }
    });

    it('should default criticality to MEDIUM', () => {
      const result = CreateAssetSchema.safeParse({
        name: 'Test',
        type: 'HVAC',
        category: 'Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.criticality).toBe('MEDIUM');
      }
    });
  });
});

describe('UpdateAssetSchema', () => {
  it('should allow partial updates', () => {
    const result = UpdateAssetSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('should validate name if provided', () => {
    const result = UpdateAssetSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should validate type if provided', () => {
    const result = UpdateAssetSchema.safeParse({
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid status update', () => {
    const result = UpdateAssetSchema.safeParse({
      status: 'MAINTENANCE',
    });
    expect(result.success).toBe(true);
  });
});

describe('AssetLocationSchema', () => {
  it('should require building', () => {
    const result = AssetLocationSchema.safeParse({
      building: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid location', () => {
    const result = AssetLocationSchema.safeParse({
      building: 'Building A',
      floor: '3',
      room: 'Server Room',
    });
    expect(result.success).toBe(true);
  });

  it('should accept location with coordinates', () => {
    const result = AssetLocationSchema.safeParse({
      building: 'Building A',
      coordinates: {
        lat: 24.7136,
        lng: 46.6753,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid coordinates', () => {
    const result = AssetLocationSchema.safeParse({
      building: 'Building A',
      coordinates: {
        lat: 200, // invalid
        lng: 46.6753,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('AssetPurchaseSchema', () => {
  it('should accept valid purchase info', () => {
    const result = AssetPurchaseSchema.safeParse({
      date: '2024-01-15',
      cost: 25000,
      supplier: 'Supplier Inc',
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative cost', () => {
    const result = AssetPurchaseSchema.safeParse({
      cost: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject future purchase date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = AssetPurchaseSchema.safeParse({
      date: futureDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid warranty info', () => {
    const result = AssetPurchaseSchema.safeParse({
      cost: 10000,
      warranty: {
        period: 24,
        terms: 'Full coverage for 2 years',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('createAssetFormDefaults', () => {
  it('should have all required fields', () => {
    expect(createAssetFormDefaults).toHaveProperty('name');
    expect(createAssetFormDefaults).toHaveProperty('type');
    expect(createAssetFormDefaults).toHaveProperty('category');
    expect(createAssetFormDefaults).toHaveProperty('status');
    expect(createAssetFormDefaults).toHaveProperty('criticality');
  });

  it('should have default Riyadh coordinates', () => {
    expect(createAssetFormDefaults.location?.coordinates?.lat).toBe(24.7136);
    expect(createAssetFormDefaults.location?.coordinates?.lng).toBe(46.6753);
  });

  it('should have default warranty period of 12 months', () => {
    expect(createAssetFormDefaults.purchase?.warranty?.period).toBe(12);
  });
});
