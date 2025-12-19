import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { NextRequest } from "next/server";
import { UserRole } from "@/types/user";
import type { SessionUser } from "@/types/session";
import {
  WORK_ORDERS_ENTITY_LEGACY,
  WORK_ORDERS_ENTITY,
} from "@/config/topbar-modules";
import { startMongoMemoryServer } from "../../../../helpers/mongoMemory";

let db: Db;
let client: MongoClient;
let mongo: Awaited<ReturnType<typeof startMongoMemoryServer>>;
let mockSession: SessionUser | null;

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: async () => ({ connection: { db } }),
}));

vi.mock("@/server/middleware/withAuthRbac", () => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    getSessionUser: async () => mockSession,
  };
});

import { GET } from "@/app/api/search/route";
import { COLLECTIONS } from "@/lib/db/collections";

const orgId = new ObjectId();
const buildRequest = (query: string) =>
  new NextRequest(new URL(`http://localhost/api/search?${query}`));

describe("GET /api/search (integration, in-memory Mongo)", () => {
  const tenantUserId = new ObjectId();
  const techUserId = new ObjectId();
  const vendorId = new ObjectId();
  const ownerPropertyId = new ObjectId();

  beforeAll(async () => {
    mongo = await startMongoMemoryServer({
      instance: { port: 0 },
      launchTimeoutMs: 60_000,
    });
    client = await MongoClient.connect(mongo.getUri());
    db = client.db("testdb");

    await db.collection(COLLECTIONS.WORK_ORDERS).createIndex({ title: "text" });
    await db.collection(COLLECTIONS.ORDERS).createIndex({ title: "text" });
    await db.collection(COLLECTIONS.PROPERTIES).createIndex({ title: "text" });

    await db.collection(COLLECTIONS.WORK_ORDERS).insertMany([
      {
        title: "Alpha tenant WO",
        orgId,
        requester: { userId: tenantUserId },
        assignment: { assignedTo: { userId: techUserId, vendorId } },
        location: { propertyId: ownerPropertyId },
      },
      {
        title: "Other tenant WO",
        orgId,
        requester: { userId: new ObjectId() },
        assignment: { assignedTo: { userId: new ObjectId() } },
        location: { propertyId: new ObjectId() },
      },
    ]);

    await db.collection(COLLECTIONS.ORDERS).insertOne({
      title: "Vendor order",
      orgId,
      vendorId,
    });

    await db.collection(COLLECTIONS.PROPERTIES).insertOne({
      title: "Owner property",
      orgId,
      _id: ownerPropertyId,
    });
  });

  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });

  it("returns only tenant-owned work orders", async () => {
    mockSession = {
      id: tenantUserId.toHexString(),
      role: UserRole.TENANT,
      orgId: orgId.toHexString(),
      tenantId: new ObjectId().toHexString(),
      vendorId: "",
    };

    const res = await GET(
      buildRequest(`app=fm&q=Alpha&entities=${WORK_ORDERS_ENTITY}`),
    );
    const json = await res.json();

    expect(json.results).toHaveLength(1);
    expect(json.results[0].title).toBe("Alpha tenant WO");
  });

  it("returns only technician-assigned work orders", async () => {
    mockSession = {
      id: techUserId.toHexString(),
      role: UserRole.TECHNICIAN,
      orgId: orgId.toHexString(),
      tenantId: "",
      vendorId: "",
    };

    const res = await GET(
      buildRequest(`app=fm&q=Alpha&entities=${WORK_ORDERS_ENTITY}`),
    );
    const json = await res.json();

    expect(json.results).toHaveLength(1);
    expect(json.results[0].title).toBe("Alpha tenant WO");
  });

  it("returns only vendor orders", async () => {
    mockSession = {
      id: new ObjectId().toHexString(),
      role: UserRole.VENDOR,
      orgId: orgId.toHexString(),
      tenantId: "",
      vendorId: vendorId.toHexString(),
    };

    const res = await GET(buildRequest("app=souq&q=Vendor&entities=orders"));
    const json = await res.json();

    expect(json.results).toHaveLength(1);
    expect(json.results[0].title).toBe("Vendor order");
  });

  it("returns only owner properties", async () => {
    mockSession = {
      id: new ObjectId().toHexString(),
      role: UserRole.OWNER,
      orgId: orgId.toHexString(),
      tenantId: "",
      vendorId: "",
      assignedProperties: [ownerPropertyId.toHexString()],
    };

    const res = await GET(buildRequest("app=fm&q=Owner&entities=properties"));
    const json = await res.json();

    expect(json.results).toHaveLength(1);
    expect(json.results[0].title).toBe("Owner property");
  });

  it("returns empty when tenant lacks unit assignments for properties search", async () => {
    mockSession = {
      id: new ObjectId().toHexString(),
      role: UserRole.TENANT,
      orgId: orgId.toHexString(),
      tenantId: new ObjectId().toHexString(),
      units: [],
    };

    const res = await GET(buildRequest("app=fm&q=Owner&entities=properties"));
    const json = await res.json();

    expect(json.results).toHaveLength(0);
  });

  it("accepts legacy work_orders alias for work orders search", async () => {
    mockSession = {
      id: new ObjectId().toHexString(),
      role: UserRole.MANAGER,
      orgId: orgId.toHexString(),
      tenantId: "",
      vendorId: "",
    };

    const res = await GET(
      buildRequest(`app=fm&q=Alpha&entities=${WORK_ORDERS_ENTITY_LEGACY}`),
    );
    const json = await res.json();

    expect(json.results).toHaveLength(1);
    expect(json.results[0].title).toBe("Alpha tenant WO");
  });
});
