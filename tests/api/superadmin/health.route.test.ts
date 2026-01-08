/**
 * @fileoverview Tests for superadmin/health API route
 * @description Returns configuration status WITHOUT exposing secrets
 * @route /api/superadmin/health
 * @sprint 45
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/health/route";

describe("superadmin/health route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("GET /api/superadmin/health", () => {
    it("should require access key in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.SUPERADMIN_SECRET_KEY = "test-secret-key";
      
      const request = new NextRequest("http://localhost:3000/api/superadmin/health");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should reject invalid access key", async () => {
      process.env.NODE_ENV = "production";
      process.env.SUPERADMIN_SECRET_KEY = "test-secret-key";
      
      const request = new NextRequest("http://localhost:3000/api/superadmin/health", {
        headers: { "x-superadmin-access-key": "wrong-key" },
      });
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return health status with valid access key", async () => {
      process.env.NODE_ENV = "production";
      process.env.SUPERADMIN_SECRET_KEY = "test-secret-key";
      
      const request = new NextRequest("http://localhost:3000/api/superadmin/health", {
        headers: { "x-superadmin-access-key": "test-secret-key" },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
