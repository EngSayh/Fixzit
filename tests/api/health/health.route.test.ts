/**
 * @fileoverview Tests for Health Check API
 * @description Tests the /api/health and /api/healthcheck endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing handler
vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const { GET } = await import('@/app/api/health/route');
      const req = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('GET /api/healthcheck', () => {
    it('should return healthcheck status', async () => {
      const { GET } = await import('@/app/api/healthcheck/route');
      const req = new NextRequest('http://localhost:3000/api/healthcheck', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness status', async () => {
      const { GET } = await import('@/app/api/health/ready/route');
      const req = new NextRequest('http://localhost:3000/api/health/ready', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 503]).toContain(response.status);
    });
  });
});
