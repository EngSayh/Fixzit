/**
 * API tests for Building Model routes
 * @module tests/api/fm/building-model.route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { GET as getModel, POST as generateModel } from '@/app/api/fm/properties/[id]/building-model/route';

// Mock dependencies
vi.mock('@/lib/mongodb-unified');
vi.mock('@/lib/logger');
vi.mock('@/app/api/fm/permissions');
vi.mock('@/app/api/fm/utils/tenant');
vi.mock('@/lib/middleware/rate-limit');
vi.mock('@/lib/audit');

describe('Building Model API', () => {
  const mockPropertyId = new ObjectId().toString();
  const mockOrgId = 'org-test-123';
  const mockUserId = 'user-test-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/fm/properties/[id]/building-model', () => {
    it('should reject invalid property ID format', async () => {
      const req = new NextRequest('http://localhost:3000/api/fm/properties/invalid-id/building-model');
      const response = await getModel(req, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid property ID format');
    });

    it('should require PROPERTY:VIEW permission', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const mockRequireFm = vi.mocked(requireFmPermission);
      
      // Mock permission denial
      mockRequireFm.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
      );

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`);
      const response = await getModel(req, { params: { id: mockPropertyId } });

      expect(response.status).toBe(403);
    });

    it('should enforce tenant isolation with orgId scoping', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const { resolveTenantId } = await import('@/app/api/fm/utils/tenant');
      const { getDatabase } = await import('@/lib/mongodb-unified');
      
      const mockRequireFm = vi.mocked(requireFmPermission);
      const mockResolveTenant = vi.mocked(resolveTenantId);
      const mockGetDb = vi.mocked(getDatabase);

      // Mock successful permission check
      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'PROPERTY_OWNER',
        isSuperAdmin: false,
      } as any);

      // Mock tenant resolution
      mockResolveTenant.mockReturnValueOnce({ tenantId: mockOrgId });

      // Mock database - verify orgId is included in query
      const mockFindOne = vi.fn().mockResolvedValue(null);
      const mockCollection = vi.fn().mockReturnValue({ findOne: mockFindOne });
      mockGetDb.mockResolvedValueOnce({ collection: mockCollection } as any);

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`);
      await getModel(req, { params: { id: mockPropertyId } });

      // Verify property query includes orgId
      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(ObjectId),
          orgId: mockOrgId,
        })
      );
    });

    it('should return 404 when property not found', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const { resolveTenantId } = await import('@/app/api/fm/utils/tenant');
      const { getDatabase } = await import('@/lib/mongodb-unified');
      
      const mockRequireFm = vi.mocked(requireFmPermission);
      const mockResolveTenant = vi.mocked(resolveTenantId);
      const mockGetDb = vi.mocked(getDatabase);

      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'PROPERTY_OWNER',
      } as any);

      mockResolveTenant.mockReturnValueOnce({ tenantId: mockOrgId });

      // Mock property not found
      const mockFindOne = vi.fn().mockResolvedValue(null);
      mockGetDb.mockResolvedValueOnce({
        collection: vi.fn().mockReturnValue({ findOne: mockFindOne }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`);
      const response = await getModel(req, { params: { id: mockPropertyId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Property not found');
    });

    it('should prevent cross-tenant access (Tenant A cannot access Tenant B model)', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const { resolveTenantId } = await import('@/app/api/fm/utils/tenant');
      const { getDatabase } = await import('@/lib/mongodb-unified');
      
      const mockRequireFm = vi.mocked(requireFmPermission);
      const mockResolveTenant = vi.mocked(resolveTenantId);
      const mockGetDb = vi.mocked(getDatabase);

      const tenantA = 'org-tenant-a';
      const tenantB = 'org-tenant-b';

      // User from Tenant A tries to access property from Tenant B
      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        orgId: tenantA,
        role: 'PROPERTY_OWNER',
      } as any);

      mockResolveTenant.mockReturnValueOnce({ tenantId: tenantA });

      // Database has property belonging to Tenant B
      const mockPropertyFromTenantB = {
        _id: new ObjectId(mockPropertyId),
        orgId: tenantB,
        name: 'Tenant B Property',
      };

      const mockFindOne = vi.fn()
        .mockResolvedValueOnce(null); // Property query with Tenant A orgId returns null

      mockGetDb.mockResolvedValueOnce({
        collection: vi.fn().mockReturnValue({ findOne: mockFindOne }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`);
      const response = await getModel(req, { params: { id: mockPropertyId } });
      const data = await response.json();

      // Should return 404 (not 403) to prevent information disclosure
      expect(response.status).toBe(404);
      expect(data.error).toBe('Property not found');

      // Verify query included Tenant A's orgId (preventing access to Tenant B's property)
      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: tenantA,
        })
      );
    });
  });

  describe('POST /api/fm/properties/[id]/building-model', () => {
    it('should require PROPERTY:UPDATE permission', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const mockRequireFm = vi.mocked(requireFmPermission);
      
      mockRequireFm.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
      );

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`, {
        method: 'POST',
        body: JSON.stringify({
          spec: {
            floors: 3,
            apartmentsPerFloor: 4,
            template: '2br',
          },
        }),
      });

      const response = await generateModel(req, { params: { id: mockPropertyId } });
      expect(response.status).toBe(403);
    });

    it('should enforce RBAC - only allowed roles can generate models', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const mockRequireFm = vi.mocked(requireFmPermission);

      // Mock user with insufficient role
      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'TENANT',
        isSuperAdmin: false,
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`, {
        method: 'POST',
        body: JSON.stringify({
          spec: {
            floors: 3,
            apartmentsPerFloor: 4,
            template: '2br',
          },
        }),
      });

      const response = await generateModel(req, { params: { id: mockPropertyId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions to generate building models');
    });

    it('should validate request body schema', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const mockRequireFm = vi.mocked(requireFmPermission);

      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'PROPERTY_OWNER',
      } as any);

      // Invalid spec (missing required fields)
      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`, {
        method: 'POST',
        body: JSON.stringify({
          spec: {
            floors: 0, // Invalid: must be >= 1
            apartmentsPerFloor: -1, // Invalid: must be >= 1
          },
        }),
      });

      const response = await generateModel(req, { params: { id: mockPropertyId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid specification');
      expect(data.details).toBeDefined();
    });

    it('should create audit log entry on successful generation', async () => {
      const { requireFmPermission } = await import('@/app/api/fm/permissions');
      const { resolveTenantId } = await import('@/app/api/fm/utils/tenant');
      const { getDatabase } = await import('@/lib/mongodb-unified');
      const { audit } = await import('@/lib/audit');
      
      const mockRequireFm = vi.mocked(requireFmPermission);
      const mockResolveTenant = vi.mocked(resolveTenantId);
      const mockGetDb = vi.mocked(getDatabase);
      const mockAudit = vi.mocked(audit);

      mockRequireFm.mockResolvedValueOnce({
        userId: mockUserId,
        email: 'test@example.com',
        orgId: mockOrgId,
        role: 'PROPERTY_OWNER',
      } as any);

      mockResolveTenant.mockReturnValueOnce({ tenantId: mockOrgId });

      const mockProperty = {
        _id: new ObjectId(mockPropertyId),
        orgId: mockOrgId,
        units: [],
      };

      const mockInsertedId = new ObjectId();
      const mockFindOne = vi.fn()
        .mockResolvedValueOnce(mockProperty) // Property exists
        .mockResolvedValueOnce(null); // No existing model

      const mockInsertOne = vi.fn().mockResolvedValue({ insertedId: mockInsertedId });
      const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

      mockGetDb.mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          findOne: mockFindOne,
          insertOne: mockInsertOne,
          updateOne: mockUpdateOne,
        }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/fm/properties/${mockPropertyId}/building-model`, {
        method: 'POST',
        body: JSON.stringify({
          spec: {
            floors: 3,
            apartmentsPerFloor: 4,
            template: '2br',
          },
        }),
      });

      await generateModel(req, { params: { id: mockPropertyId } });

      // Verify audit log was called
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'building_model.generate',
          actorId: mockUserId,
          orgId: mockOrgId,
          success: true,
        })
      );
    });
  });
});
