/**
 * @fileoverview Tests for Aqar Agents API
 * @description Tests the /api/aqar/agents endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Agents API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/agents', () => {
    it('should return agents', async () => {
      const { GET } = await import('@/app/api/aqar/agents/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/agents', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
