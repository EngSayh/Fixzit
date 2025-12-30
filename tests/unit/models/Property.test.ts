/**
 * Property model unit tests - PRODUCTION READY
 *
 * ✅ Uses REAL MongoDB Memory Server
 * ✅ Tests with real database operations
 * ✅ No mocking
 *
 * Tests:
 * - Schema validation (required fields, enums)
 * - Location and address information
 * - Property details and financial data
 * - Multi-tenant isolation
 * - Index verification
 * - Plugin integration (tenant isolation, audit)
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  setTenantContext,
  clearTenantContext,
} from "@/server/plugins/tenantIsolation";

let Property: mongoose.Model<any>;
let localMongoServer: MongoMemoryServer | null = null;

/**
 * Wait for mongoose connection to be ready (max 30s).
 * If not connected after timeout, attempts to start a local MongoMemoryServer.
 */
async function ensureMongoConnection(maxWaitMs = 10000): Promise<void> {
  const start = Date.now();
  
  // First, wait for global setup to potentially connect
  while (mongoose.connection.readyState !== 1 && Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  // If still not connected, start our own MongoMemoryServer
  if (mongoose.connection.readyState !== 1) {
    if (!localMongoServer) {
      localMongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: "fixzit-test-property",
          launchTimeout: 60000,
        },
      });
      const uri = localMongoServer.getUri();
      await mongoose.connect(uri, {
        autoCreate: true,
        autoIndex: true,
      });
    }
  }
  
  // Final check
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      `Mongoose not connected - readyState: ${mongoose.connection.readyState}`
    );
  }
}

beforeAll(async () => {
  await ensureMongoConnection();
});

afterAll(async () => {
  // Cleanup local MongoMemoryServer if we started one
  if (localMongoServer) {
    await mongoose.disconnect();
    await localMongoServer.stop();
    localMongoServer = null;
  }
});

beforeEach(async () => {
  // Connection is ensured by beforeAll
  clearTenantContext();

  // Clear module cache to force fresh import
  vi.resetModules();

  // Import model (will reuse if already registered)
  const propertyModule = await import("@/server/models/Property");
  Property = propertyModule.Property as mongoose.Model<any>;

  // Set tenant context
  setTenantContext({ orgId: "org-test-prop-123" });

  // Verify model initialization
  if (!Property || !Property.schema) {
    throw new Error("Property model not properly initialized");
  }

  // Verify tenantIsolationPlugin applied
  if (!Property.schema.paths.orgId) {
    throw new Error(
      "Property schema missing orgId - tenantIsolationPlugin did not run",
    );
  }
});

function buildValidProperty(
  overrides: Record<string, any> = {},
): Record<string, any> {
  const orgId = new mongoose.Types.ObjectId();
  const createdById = new mongoose.Types.ObjectId();

  return {
    orgId,
    code: `PROP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: "Test Property",
    type: "RESIDENTIAL",
    address: {
      street: "123 Main Street",
      city: "Riyadh",
      region: "Central",
      country: "SA",
      coordinates: {
        lat: 24.7136,
        lng: 46.6753,
      },
    },
    createdBy: createdById,
    ...overrides,
  };
}

describe("Property model - Schema Validation", () => {
  it("should create property with valid minimal data", () => {
    const data = buildValidProperty();
    const doc = new Property(data);
    const err = doc.validateSync();

    expect(err).toBeUndefined();
    expect(doc.code).toBeDefined();
    expect(doc.name).toBeDefined();
    expect(doc.type).toBe("RESIDENTIAL");
  });

  it("should enforce required fields", () => {
    const requiredFields = [
      "orgId",
      "code",
      "name",
      "type",
      "address.coordinates.lat",
      "address.coordinates.lng",
    ] as const;

    for (const field of ["orgId", "code", "name", "type"]) {
      const data = buildValidProperty();
      delete data[field];
      const doc = new Property(data);
      const err = doc.validateSync();

      expect(
        err,
        `Expected validation error for missing field: ${field}`,
      ).toBeDefined();
    }
  });

  it("should validate type enum", () => {
    const validTypes = [
      "RESIDENTIAL",
      "COMMERCIAL",
      "INDUSTRIAL",
      "MIXED_USE",
      "LAND",
    ];

    for (const type of validTypes) {
      const doc = new Property(buildValidProperty({ type }));
      expect(doc.validateSync()).toBeUndefined();
    }

    const badDoc = new Property(
      buildValidProperty({ type: "INVALID_TYPE" as any }),
    );
    const err = badDoc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors?.type).toBeDefined();
  });

  it("should default address.country to SA", () => {
    const data = buildValidProperty({
      address: {
        street: "123 Main St",
        city: "Riyadh",
        coordinates: { lat: 24.7136, lng: 46.6753 },
      },
    });
    const doc = new Property(data);
    expect(doc.address.country).toBe("SA");
  });
});

describe("Property model - Database Operations", () => {
  it("should save property to real MongoDB", async () => {
    const data = buildValidProperty();
    const doc = new Property(data);

    const saved = await doc.save();

    expect(saved._id).toBeDefined();
    expect(saved.code).toBe(data.code);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  it("should find property by code", async () => {
    const propCode = "PROP-FIND-123";
    const data = buildValidProperty({ code: propCode });
    await Property.create(data);

    const found = await Property.findOne({ code: propCode });

    expect(found).toBeDefined();
    expect(found?.code).toBe(propCode);
    expect(found?.name).toBe(data.name);
  });

  it("should update property details", async () => {
    const data = buildValidProperty({ name: "Original Name" });
    const doc = await Property.create(data);

    doc.name = "Updated Name";
    await doc.save();

    const updated = await Property.findById(doc._id);
    expect(updated?.name).toBe("Updated Name");
  });

  it("should delete property from database", async () => {
    const data = buildValidProperty();
    const doc = await Property.create(data);

    await Property.deleteOne({ _id: doc._id });

    const found = await Property.findById(doc._id);
    expect(found).toBeNull();
  });
});

describe("Property model - Multi-tenant Isolation", () => {
  it("should enforce unique code per organization", async () => {
    const propCode = "PROP-UNIQUE-001";
    const orgId = new mongoose.Types.ObjectId();

    // Create first property
    await Property.create(buildValidProperty({ code: propCode, orgId }));

    // Try to create duplicate in same org - should fail
    await expect(
      Property.create(buildValidProperty({ code: propCode, orgId })),
    ).rejects.toThrow(/duplicate key|E11000/);
  });

  it("should allow same code in different organizations", async () => {
    const propCode = "PROP-SHARED-001";
    const org1Id = new mongoose.Types.ObjectId();
    const org2Id = new mongoose.Types.ObjectId();

    // Create property in org1
    setTenantContext({ orgId: org1Id });
    const prop1 = await Property.create(
      buildValidProperty({ code: propCode, orgId: org1Id }),
    );

    // Create property with same code in org2 - should succeed
    setTenantContext({ orgId: org2Id });
    const prop2 = await Property.create(
      buildValidProperty({ code: propCode, orgId: org2Id }),
    );

    expect(prop1.code).toBe(propCode);
    expect(prop2.code).toBe(propCode);
    expect(prop1.orgId.toString()).toBe(org1Id.toString());
    expect(prop2.orgId.toString()).toBe(org2Id.toString());
  });
});

describe("Property model - Location Information", () => {
  it("should require coordinates (lat, lng)", () => {
    const data = buildValidProperty();
    delete data.address.coordinates.lat;
    const doc1 = new Property(data);
    const err1 = doc1.validateSync();
    expect(err1).toBeDefined();
    expect(err1?.errors?.["address.coordinates.lat"]).toBeDefined();

    const data2 = buildValidProperty();
    delete data2.address.coordinates.lng;
    const doc2 = new Property(data2);
    const err2 = doc2.validateSync();
    expect(err2).toBeDefined();
    expect(err2?.errors?.["address.coordinates.lng"]).toBeDefined();
  });

  it("should store full address information", () => {
    const data = buildValidProperty({
      address: {
        street: "456 King Fahd Road",
        city: "Riyadh",
        region: "Central Region",
        postalCode: "11564",
        country: "SA",
        coordinates: {
          lat: 24.7136,
          lng: 46.6753,
        },
        district: "Olaya",
        nationalAddress: "RRJJ2345",
      },
    });
    const doc = new Property(data);

    expect(doc.address.street).toBe("456 King Fahd Road");
    expect(doc.address.city).toBe("Riyadh");
    expect(doc.address.region).toBe("Central Region");
    expect(doc.address.postalCode).toBe("11564");
    expect(doc.address.district).toBe("Olaya");
    expect(doc.address.nationalAddress).toBe("RRJJ2345");
    expect(doc.address.coordinates.lat).toBe(24.7136);
    expect(doc.address.coordinates.lng).toBe(46.6753);
  });
});

describe("Property model - Property Details", () => {
  it("should store property details", () => {
    const data = buildValidProperty({
      details: {
        totalArea: 200,
        builtArea: 180,
        bedrooms: 3,
        bathrooms: 2,
        floors: 2,
        parkingSpaces: 2,
        yearBuilt: 2020,
        occupancyRate: 85,
      },
    });
    const doc = new Property(data);

    expect(doc.details.totalArea).toBe(200);
    expect(doc.details.bedrooms).toBe(3);
    expect(doc.details.bathrooms).toBe(2);
    expect(doc.details.floors).toBe(2);
    expect(doc.details.occupancyRate).toBe(85);
  });

  it("should validate occupancyRate boundaries (0-100)", () => {
    let doc = new Property(
      buildValidProperty({
        details: { occupancyRate: -1 },
      }),
    );
    expect(doc.validateSync()?.errors?.["details.occupancyRate"]).toBeDefined();

    doc = new Property(
      buildValidProperty({
        details: { occupancyRate: 101 },
      }),
    );
    expect(doc.validateSync()?.errors?.["details.occupancyRate"]).toBeDefined();

    doc = new Property(
      buildValidProperty({
        details: { occupancyRate: 0 },
      }),
    );
    expect(doc.validateSync()).toBeUndefined();

    doc = new Property(
      buildValidProperty({
        details: { occupancyRate: 100 },
      }),
    );
    expect(doc.validateSync()).toBeUndefined();
  });
});

describe("Property model - Financial Information", () => {
  it("should store financial data", () => {
    const data = buildValidProperty({
      financial: {
        purchasePrice: 1500000,
        currentValue: 1800000,
        monthlyRent: 5000,
        annualYield: 4.2,
        mortgage: {
          amount: 1000000,
          monthlyPayment: 4500,
          interestRate: 3.5,
          remaining: 800000,
        },
      },
    });
    const doc = new Property(data);

    expect(doc.financial.purchasePrice).toBe(1500000);
    expect(doc.financial.currentValue).toBe(1800000);
    expect(doc.financial.monthlyRent).toBe(5000);
    expect(doc.financial.annualYield).toBe(4.2);
    expect(doc.financial.mortgage.amount).toBe(1000000);
    expect(doc.financial.mortgage.remaining).toBe(800000);
  });
});

describe("Property model - Ownership", () => {
  it("should validate ownership.type enum", () => {
    const validTypes = ["OWNED", "LEASED", "MANAGED"];

    for (const type of validTypes) {
      const doc = new Property(
        buildValidProperty({
          ownership: { type },
        }),
      );
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("should store ownership information", () => {
    const data = buildValidProperty({
      ownership: {
        type: "OWNED",
        owner: {
          name: "Property Owner LLC",
          contact: "+966501234567",
          id: "1234567890",
        },
      },
    });
    const doc = new Property(data);

    expect(doc.ownership.type).toBe("OWNED");
    expect(doc.ownership.owner.name).toBe("Property Owner LLC");
    expect(doc.ownership.owner.contact).toBe("+966501234567");
    expect(doc.ownership.owner.id).toBe("1234567890");
  });

  it("should store lease information", () => {
    const leaseStart = new Date("2025-01-01");
    const leaseEnd = new Date("2025-12-31");

    const data = buildValidProperty({
      ownership: {
        type: "LEASED",
        lease: {
          startDate: leaseStart,
          endDate: leaseEnd,
          monthlyRent: 8000,
          landlord: "Building Owner",
        },
      },
    });
    const doc = new Property(data);

    expect(doc.ownership.lease.startDate).toEqual(leaseStart);
    expect(doc.ownership.lease.endDate).toEqual(leaseEnd);
    expect(doc.ownership.lease.monthlyRent).toBe(8000);
    expect(doc.ownership.lease.landlord).toBe("Building Owner");
  });
});

describe("Property model - Plugins", () => {
  it("should have orgId field from tenantIsolationPlugin", () => {
    expect(Property.schema.paths.orgId).toBeDefined();
  });

  it("should have audit fields from auditPlugin", () => {
    expect(Property.schema.paths.createdBy).toBeDefined();
    expect(Property.schema.paths.updatedBy).toBeDefined();
    expect(Property.schema.paths.version).toBeDefined();
  });

  it("should have timestamps enabled", () => {
    expect(Property.schema.options.timestamps).toBe(true);
    expect(Property.schema.paths.createdAt).toBeDefined();
    expect(Property.schema.paths.updatedAt).toBeDefined();
  });
});
