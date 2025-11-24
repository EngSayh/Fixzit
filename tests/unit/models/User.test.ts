/**
 * User model unit tests - PRODUCTION READY
 *
 * ✅ Uses REAL MongoDB Memory Server
 * ✅ Tests with real database operations
 * ✅ No mocking
 *
 * Tests:
 * - Schema validation (email, password, role)
 * - Required fields enforcement
 * - Email uniqueness per organization (multi-tenant)
 * - Role enum validation
 * - Default values (isActive, permissions)
 * - Index verification (orgId + email unique)
 * - Plugin integration (tenant isolation, audit)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  setTenantContext,
  clearTenantContext,
} from "@/server/plugins/tenantIsolation";
import { Role } from "@/domain/fm/fm.behavior";

// Model imported AFTER mongoose connection
let User: mongoose.Model<any>;

beforeEach(async () => {
  clearTenantContext();

  // Verify mongoose is connected
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Mongoose not connected - tests require active connection");
  }

  // Clear module cache to force fresh import
  vi.resetModules();

  // Import model (will reuse if already registered)
  const userModule = await import("@/modules/users/schema");
  User = userModule.User as mongoose.Model<any>;

  // Set tenant context
  setTenantContext({ orgId: "org-test-123" });

  // Verify model initialized
  if (!User || !User.schema) {
    throw new Error("User model not properly initialized");
  }

  // Verify tenantIsolationPlugin applied
  if (!User.schema.paths.orgId) {
    throw new Error(
      "User schema missing orgId - tenantIsolationPlugin did not run",
    );
  }
});

/**
 * Build valid user data with all required fields
 */
function buildValidUser(
  overrides: Record<string, any> = {},
): Record<string, any> {
  const orgId = new mongoose.Types.ObjectId();
  const createdById = new mongoose.Types.ObjectId();

  return {
    orgId,
    email: `test-${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: "$2a$10$abcdefghijklmnopqrstuv", // bcrypt hash format
    name: "Test User",
    role: Role.TECHNICIAN, // Use actual Role enum value
    permissions: [],
    isActive: true,
    createdBy: createdById,
    ...overrides,
  };
}

describe("User model - Schema Validation", () => {
  it("should create user with valid minimal data", () => {
    const data = buildValidUser();
    const doc = new User(data);
    const err = doc.validateSync();

    expect(err).toBeUndefined();
    expect(doc.email).toBeDefined();
    expect(doc.name).toBeDefined();
    expect(doc.role).toBe(Role.TECHNICIAN);
    expect(doc.isActive).toBe(true);
  });

  it("should apply default values for isActive and permissions", () => {
    const data = buildValidUser({
      isActive: undefined,
      permissions: undefined,
    });
    const doc = new User(data);
    const err = doc.validateSync();

    expect(err).toBeUndefined();
    expect(doc.isActive).toBe(true);
    expect(doc.permissions).toEqual([]);
  });

  it("should enforce required fields: email, passwordHash, name, role", () => {
    const requiredFields = ["email", "passwordHash", "name", "role"] as const;

    for (const field of requiredFields) {
      const data = buildValidUser();
      delete data[field];
      const doc = new User(data);
      const err = doc.validateSync();

      expect(err).toBeDefined();
      expect(err?.errors?.[field]).toBeDefined();
    }
  });

  it("should lowercase and trim email addresses", () => {
    const data = buildValidUser({ email: "  TEST@EXAMPLE.COM  " });
    const doc = new User(data);

    expect(doc.email).toBe("test@example.com");
  });

  it("should trim name field", () => {
    const data = buildValidUser({ name: "  John Doe  " });
    const doc = new User(data);

    expect(doc.name).toBe("John Doe");
  });
});

describe("User model - Role Validation", () => {
  it("should accept valid roles from Role enum", () => {
    const validRoles = [
      Role.SUPER_ADMIN,
      Role.CORPORATE_ADMIN,
      Role.MANAGEMENT,
      Role.TECHNICIAN,
      Role.TENANT,
      Role.VENDOR,
    ];

    for (const role of validRoles) {
      const data = buildValidUser({ role });
      const doc = new User(data);
      const err = doc.validateSync();

      expect(err).toBeUndefined();
      expect(doc.role).toBe(role);
    }
  });

  it("should reject invalid roles", () => {
    const data = buildValidUser({ role: "INVALID_ROLE" as any });
    const doc = new User(data);
    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err?.errors?.role).toBeDefined();
  });
});

describe("User model - Database Operations", () => {
  it("should save user to real MongoDB", async () => {
    const data = buildValidUser();
    const doc = new User(data);

    const saved = await doc.save();

    expect(saved._id).toBeDefined();
    expect(saved.email).toBe(data.email);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  it("should find user by email in tenant context", async () => {
    const data = buildValidUser({ email: "findme@example.com" });
    await User.create(data);

    const found = await User.findOne({ email: "findme@example.com" });

    expect(found).toBeDefined();
    expect(found?.email).toBe("findme@example.com");
    // orgId is ObjectId, not string
    expect(found?.orgId.toString()).toBe(data.orgId.toString());
  });

  it("should enforce unique email per organization (multi-tenant)", async () => {
    const email = "duplicate@example.com";
    const orgId = new mongoose.Types.ObjectId();

    // Create first user
    await User.create(buildValidUser({ email, orgId }));

    // Try to create duplicate in same org - should fail with duplicate key error
    await expect(User.create(buildValidUser({ email, orgId }))).rejects.toThrow(
      /duplicate key|E11000/,
    );
  });

  it("should allow same email in different organizations", async () => {
    const email = "sameemail@example.com";
    const org1Id = new mongoose.Types.ObjectId();
    const org2Id = new mongoose.Types.ObjectId();

    // Create user in org1
    setTenantContext({ orgId: org1Id });
    const user1 = await User.create(buildValidUser({ email, orgId: org1Id }));

    // Create user with same email in org2 - should succeed
    setTenantContext({ orgId: org2Id });
    const user2 = await User.create(buildValidUser({ email, orgId: org2Id }));

    expect(user1.email).toBe(email);
    expect(user2.email).toBe(email);
    expect(user1.orgId.toString()).toBe(org1Id.toString());
    expect(user2.orgId.toString()).toBe(org2Id.toString());
  });

  it("should update user and track updatedAt timestamp", async () => {
    const data = buildValidUser();
    const doc = await User.create(data);

    const originalUpdatedAt = doc.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    doc.name = "Updated Name";
    await doc.save();

    expect(doc.name).toBe("Updated Name");
    expect(doc.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });

  it("should delete user from database", async () => {
    const data = buildValidUser({ email: "deleteme@example.com" });
    const doc = await User.create(data);

    await User.deleteOne({ _id: doc._id });

    const found = await User.findById(doc._id);
    expect(found).toBeNull();
  });
});

describe("User model - Indexes", () => {
  it("should have compound unique index on orgId + email", () => {
    const indexes = User.schema.indexes();

    const hasUniqueEmailIndex = indexes.some(([fields, options]) => {
      return (
        fields.orgId === 1 && fields.email === 1 && options?.unique === true
      );
    });

    expect(hasUniqueEmailIndex).toBe(true);
  });

  it("should have compound unique sparse index on orgId + employeeId", () => {
    const indexes = User.schema.indexes();

    const hasEmployeeIdIndex = indexes.some(([fields, options]) => {
      return (
        fields.orgId === 1 &&
        fields.employeeId === 1 &&
        options?.unique === true &&
        options?.sparse === true
      );
    });

    expect(hasEmployeeIdIndex).toBe(true);
  });

  it("should have index on orgId + role + isActive", () => {
    const indexes = User.schema.indexes();

    const hasRoleIndex = indexes.some(([fields]) => {
      return fields.orgId === 1 && fields.role === 1 && fields.isActive === 1;
    });

    expect(hasRoleIndex).toBe(true);
  });
});

describe("User model - Plugins", () => {
  it("should have orgId field from tenantIsolationPlugin", () => {
    expect(User.schema.paths.orgId).toBeDefined();
  });

  it("should have audit fields from auditPlugin", () => {
    expect(User.schema.paths.createdBy).toBeDefined();
    expect(User.schema.paths.updatedBy).toBeDefined();
    expect(User.schema.paths.version).toBeDefined();
  });

  it("should have timestamps enabled", () => {
    expect(User.schema.options.timestamps).toBe(true);
    expect(User.schema.paths.createdAt).toBeDefined();
    expect(User.schema.paths.updatedAt).toBeDefined();
  });

  it("should exclude passwordHash from select by default", () => {
    const passwordField = User.schema.paths.passwordHash;
    expect(passwordField.options.select).toBe(false);
  });
});

describe("User model - Optional Fields", () => {
  it("should allow optional employeeId", async () => {
    const data = buildValidUser({ employeeId: "EMP-12345" });
    const doc = await User.create(data);

    expect(doc.employeeId).toBe("EMP-12345");
  });

  it("should allow user without employeeId", async () => {
    const data = buildValidUser({ role: Role.TECHNICIAN }); // Explicitly set role
    delete data.employeeId;
    const doc = await User.create(data);

    expect(doc.employeeId).toBeUndefined();
    expect(doc.role).toBe(Role.TECHNICIAN);
  });

  it("should store optional email verification timestamp", async () => {
    const verifiedAt = new Date();
    const data = buildValidUser({ emailVerifiedAt: verifiedAt });
    const doc = await User.create(data);

    expect(doc.emailVerifiedAt).toBeDefined();
    expect(doc.emailVerifiedAt.getTime()).toBe(verifiedAt.getTime());
  });

  it("should store optional last login timestamp", async () => {
    const lastLogin = new Date();
    const data = buildValidUser({ lastLoginAt: lastLogin });
    const doc = await User.create(data);

    expect(doc.lastLoginAt).toBeDefined();
    expect(doc.lastLoginAt.getTime()).toBe(lastLogin.getTime());
  });

  it("should store permissions array", async () => {
    const permissions = ["read:reports", "write:work-orders", "delete:assets"];
    const data = buildValidUser({ permissions });
    const doc = await User.create(data);

    expect(doc.permissions).toEqual(permissions);
  });
});
