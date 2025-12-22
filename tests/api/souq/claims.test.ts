import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import type { Db } from "mongodb";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

/**
 * Claims API Test Suite
 *
 * Tests the Souq marketplace claims system including:
 * - Claim creation and validation
 * - Evidence upload and management
 * - Seller response workflow
 * - Admin decision making
 * - Appeal process
 * - Fraud detection
 * - Partial refunds
 * - Deadline enforcement
 *
 * Coverage Target: 90% (from 40%)
 */

describe("Claims API - Core Functionality", () => {
  let db: Db;
  let client: MongoClient;
  let testOrderId: ObjectId;
  let testBuyerId: ObjectId;
  let testSellerId: ObjectId;
  let testClaimId: ObjectId;
  let testOrgId: ObjectId;

  beforeAll(async () => {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit-test";
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up test data
    await db.collection("claims").deleteMany({ testData: true });
    await db.collection("orders").deleteMany({ testData: true });
    await db.collection("users").deleteMany({ testData: true });
    testOrgId = new ObjectId();
    const buyerCode = new ObjectId().toHexString();
    const sellerCode = new ObjectId().toHexString();

    // Create test users
    const buyerResult = await db.collection("users").insertOne({
      email: "buyer@test.com",
      role: "tenant",
      orgId: testOrgId,
      code: buyerCode,
      username: "buyer_user",
      testData: true,
      createdAt: new Date(),
    });
    testBuyerId = buyerResult.insertedId;

    const sellerResult = await db.collection("users").insertOne({
      email: "seller@test.com",
      role: "vendor",
      orgId: testOrgId,
      code: sellerCode,
      username: "seller_user",
      testData: true,
      createdAt: new Date(),
    });
    testSellerId = sellerResult.insertedId;

    // Create test order with orgId for multi-tenant isolation
    const orderResult = await db.collection("orders").insertOne({
      buyerId: testBuyerId,
      sellerId: testSellerId,
      orgId: testOrgId,
      items: [
        {
          productId: new ObjectId(),
          name: "Test Product",
          quantity: 1,
          price: 100,
          total: 100,
        },
      ],
      total: 100,
      status: "delivered",
      deliveredAt: new Date(),
      testData: true,
      createdAt: new Date(),
    });
    testOrderId = orderResult.insertedId;
  });

  describe("POST /api/souq/claims - Create Claim", () => {
    it("should create a claim with valid data", async () => {
      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_not_as_described",
        description: "The product color was different from the listing",
        requestedAmount: 100,
        requestType: "refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty("claimId");
      expect(data.status).toBe("pending_review");

      testClaimId = new ObjectId(data.claimId);
    });

    it("should reject claim with missing required fields", async () => {
      const claim = {
        orderId: testOrderId.toString(),
        // Missing reason
        description: "Test description",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("reason");
    });

    it("should reject claim after deadline (30 days)", async () => {
      // Update order to be delivered 31 days ago
      await db.collection("orders").updateOne(
        { _id: testOrderId },
        {
          $set: {
            deliveredAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          },
        },
      );

      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_defective",
        description: "Product stopped working",
        requestedAmount: 100,
        requestType: "refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("deadline");
    });

    it("should reject duplicate claim for same order", async () => {
      // Create first claim
      await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "pending_review",
        reason: "product_defective",
        testData: true,
        createdAt: new Date(),
      });

      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_not_as_described",
        description: "Different issue",
        requestedAmount: 50,
        requestType: "partial_refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("existing claim");
    });

    it("should validate requested amount does not exceed order total", async () => {
      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_defective",
        description: "Product not working",
        requestedAmount: 150, // Order total is 100
        requestType: "refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("exceeds order total");
    });
  });

  describe("POST /api/souq/claims/[id]/evidence - Upload Evidence", () => {
    beforeEach(async () => {
      const claimResult = await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "pending_review",
        reason: "product_defective",
        description: "Test claim",
        requestedAmount: 100,
        evidence: [],
        testData: true,
        createdAt: new Date(),
      });
      testClaimId = claimResult.insertedId;
    });

    it("should accept valid image evidence", async () => {
      const formData = new FormData();
      const blob = new Blob(["fake image data"], { type: "image/jpeg" });
      formData.append("file", blob, "evidence.jpg");
      formData.append("description", "Photo of defective product");

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/evidence`,
        {
          method: "POST",
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: formData,
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.evidence).toHaveLength(1);
      expect(data.evidence[0]).toHaveProperty("url");
      expect(data.evidence[0].type).toBe("image");
    });

    it("should reject evidence file over size limit (10MB)", async () => {
      const formData = new FormData();
      // Create 11MB blob
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], {
        type: "image/jpeg",
      });
      formData.append("file", largeBlob, "large.jpg");

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/evidence`,
        {
          method: "POST",
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: formData,
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("size");
    });

    it("should reject invalid file types", async () => {
      const formData = new FormData();
      const blob = new Blob(["fake executable"], {
        type: "application/x-executable",
      });
      formData.append("file", blob, "virus.exe");

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/evidence`,
        {
          method: "POST",
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: formData,
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("file type");
    });

    it("should enforce maximum evidence count (10 files)", async () => {
      // Add 10 evidence files
      await db.collection("claims").updateOne(
        { _id: testClaimId },
        {
          $set: {
            evidence: Array(10)
              .fill(null)
              .map((_, i) => ({
                type: "image",
                url: `https://storage.example.com/evidence${i}.jpg`,
                uploadedAt: new Date(),
              })),
          },
        },
      );

      const formData = new FormData();
      const blob = new Blob(["fake image"], { type: "image/jpeg" });
      formData.append("file", blob, "extra.jpg");

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/evidence`,
        {
          method: "POST",
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: formData,
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("maximum");
    });
  });

  describe("POST /api/souq/claims/[id]/response - Seller Response", () => {
    beforeEach(async () => {
      const claimResult = await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "pending_seller_response",
        reason: "product_defective",
        description: "Test claim",
        requestedAmount: 100,
        evidence: [],
        testData: true,
        createdAt: new Date(),
      });
      testClaimId = claimResult.insertedId;
    });

    it("should accept seller acceptance of claim", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testSellerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            action: "accept",
            message: "We apologize for the inconvenience",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("approved");

      // Verify in database
      const claim = await db.collection("claims").findOne({ _id: testClaimId });
      expect(claim?.sellerResponse).toBeDefined();
      expect(claim?.sellerResponse.action).toBe("accept");
    });

    it("should accept seller dispute with counter-evidence", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testSellerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            action: "dispute",
            message: "Product was delivered in perfect condition",
            counterEvidence: [
              {
                type: "image",
                url: "https://storage.example.com/delivery-proof.jpg",
                description: "Delivery photo showing intact package",
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("under_review");
      expect(data.sellerResponse.counterEvidence).toHaveLength(1);
    });

    it("should reject response after deadline (5 days)", async () => {
      // Update claim to be 6 days old
      await db.collection("claims").updateOne(
        { _id: testClaimId },
        {
          $set: {
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testSellerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            action: "dispute",
            message: "Too late",
          }),
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("deadline");
    });

    // 🔐 SECURITY: Returns 404 instead of 403 to prevent cross-tenant existence leaks
    it("should reject response from non-seller with 404 (prevents existence leak)", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(), // Wrong user
          },
          body: JSON.stringify({
            action: "accept",
            message: "Not authorized",
          }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/souq/claims/[id]/decision - Admin Decision", () => {
    let adminId: ObjectId;

    beforeEach(async () => {
      const adminResult = await db.collection("users").insertOne({
        email: `admin@${EMAIL_DOMAIN}`,
        // 🔒 SECURITY FIX: Use standard role name from UserRole enum (SUPER_ADMIN not SUPERADMIN)
        role: "SUPER_ADMIN",
        orgId: testOrgId,
        testData: true,
      });
      adminId = adminResult.insertedId;

      const claimResult = await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "under_review",
        reason: "product_defective",
        description: "Test claim",
        requestedAmount: 100,
        sellerResponse: {
          action: "dispute",
          message: "Seller disputes",
          respondedAt: new Date(),
        },
        testData: true,
        createdAt: new Date(),
      });
      testClaimId = claimResult.insertedId;
    });

    it("should approve claim with full refund", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": adminId.toString(),
            "x-user-role": "SUPER_ADMIN",
            "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            decision: "approve",
            refundAmount: 100,
            reasoning: "Buyer evidence is compelling",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("approved");
      expect(data.refundAmount).toBe(100);
    });

    it("should approve claim with partial refund", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": adminId.toString(),
            "x-user-role": "SUPER_ADMIN",
            "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            decision: "approve",
            refundAmount: 50, // Partial refund
            reasoning: "Product has some value despite defect",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("approved");
      expect(data.refundAmount).toBe(50);
    });

    it("should reject claim in favor of seller", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": adminId.toString(),
            "x-user-role": "SUPER_ADMIN",
            "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            decision: "reject",
            reasoning: "Seller provided proof of proper delivery",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("rejected");
      expect(data.refundAmount).toBe(0);
    });

    it("should reject decision from non-admin", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            decision: "approve",
            refundAmount: 100,
          }),
        },
      );

      // 🔐 STRICT v4.1: Non-admin gets 404 (not 403) to prevent info leakage about claims they can't access
      expect(response.status).toBe(404);
    });

    it("should calculate seller protection eligibility", async () => {
      // Create claim where seller should be protected
      await db.collection("claims").updateOne(
        { _id: testClaimId },
        {
          $set: {
            sellerResponse: {
              action: "dispute",
              message: "Valid dispute",
              counterEvidence: [
                { type: "tracking", url: "tracking-proof" },
                { type: "signature", url: "signature-proof" },
              ],
              respondedAt: new Date(),
            },
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": adminId.toString(),
            "x-user-role": "SUPER_ADMIN",
            "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            decision: "reject",
            reasoning: "Seller meets protection criteria",
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sellerProtected).toBe(true);
    });
  });

  describe("POST /api/souq/claims/[id]/appeal - Appeal Process", () => {
    beforeEach(async () => {
      const claimResult = await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "rejected",
        reason: "product_defective",
        description: "Test claim",
        requestedAmount: 100,
        decision: {
          outcome: "reject",
          reasoning: "Insufficient evidence",
          decidedAt: new Date(),
          decidedBy: new ObjectId(),
        },
        testData: true,
        createdAt: new Date(),
      });
      testClaimId = claimResult.insertedId;
    });

    it("should accept appeal with new evidence", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/appeal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            reasoning: "New evidence discovered",
            additionalEvidence: [
              {
                type: "video",
                url: "https://storage.example.com/defect-video.mp4",
                description: "Video showing product defect",
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("under_appeal");
      expect(data.appeal).toBeDefined();
    });

    it("should reject appeal after deadline (7 days)", async () => {
      // Update decision to be 8 days old
      await db.collection("claims").updateOne(
        { _id: testClaimId },
        {
          $set: {
            "decision.decidedAt": new Date(
              Date.now() - 8 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/appeal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            reasoning: "Too late",
          }),
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("appeal deadline");
    });

    it("should reject duplicate appeal", async () => {
      // Add existing appeal
      await db.collection("claims").updateOne(
        { _id: testClaimId },
        {
          $set: {
            status: "under_appeal",
            appeal: {
              reasoning: "First appeal",
              submittedAt: new Date(),
            },
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}/appeal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
          body: JSON.stringify({
            reasoning: "Second appeal",
          }),
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("already appealed");
    });
  });

  describe("Fraud Detection Workflow", () => {
    it("should flag suspicious claim patterns", async () => {
      // Create multiple claims from same buyer
      for (let i = 0; i < 5; i++) {
        const order = await db.collection("orders").insertOne({
          buyerId: testBuyerId,
          sellerId: new ObjectId(),
          orgId: testOrgId,
          total: 100,
          status: "delivered",
          testData: true,
        });

        await db.collection("claims").insertOne({
          orderId: order.insertedId,
          buyerId: testBuyerId,
          sellerId: new ObjectId(),
          orgId: testOrgId,
          status: "pending_review",
          reason: "product_defective",
          testData: true,
          createdAt: new Date(),
        });
      }

      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_defective",
        description: "Yet another defective product",
        requestedAmount: 100,
        requestType: "refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.fraudRisk).toBe("high");
      expect(data.requiresManualReview).toBe(true);
    });

    it("should detect high-value claim patterns", async () => {
      // Create expensive order
      await db
        .collection("orders")
        .updateOne({ _id: testOrderId }, { $set: { total: 5000 } });

      const claim = {
        orderId: testOrderId.toString(),
        reason: "product_not_received",
        description: "Package never arrived",
        requestedAmount: 5000,
        requestType: "refund",
      };

      const response = await fetch("http://localhost:3000/api/souq/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
        },
        body: JSON.stringify(claim),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.requiresEnhancedVerification).toBe(true);
    });
  });

  describe("GET /api/souq/claims - List Claims", () => {
    beforeEach(async () => {
      // Create multiple test claims
      await db.collection("claims").insertMany([
        {
          orderId: testOrderId,
          buyerId: testBuyerId,
          sellerId: testSellerId,
          orgId: testOrgId,
          status: "pending_review",
          reason: "product_defective",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          testData: true,
        },
        {
          orderId: new ObjectId(),
          buyerId: testBuyerId,
          sellerId: testSellerId,
          orgId: testOrgId,
          status: "approved",
          reason: "wrong_item",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          testData: true,
        },
        {
          orderId: new ObjectId(),
          buyerId: testBuyerId,
          sellerId: testSellerId,
          orgId: testOrgId,
          status: "rejected",
          reason: "product_not_as_described",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          testData: true,
        },
      ]);
    });

    it("should list claims for buyer", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims?userId=${testBuyerId.toString()}`,
        {
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.claims).toHaveLength(3);
    });

    it("should filter claims by status", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims?userId=${testBuyerId.toString()}&status=approved`,
        {
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.claims).toHaveLength(1);
      expect(data.claims[0].status).toBe("approved");
    });

    it("should paginate results", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims?userId=${testBuyerId.toString()}&page=1&limit=2`,
        {
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.claims).toHaveLength(2);
      expect(data.pagination).toHaveProperty("total");
      expect(data.pagination).toHaveProperty("pages");
    });
  });

  describe("GET /api/souq/claims/[id] - Get Claim Details", () => {
    beforeEach(async () => {
      const claimResult = await db.collection("claims").insertOne({
        orderId: testOrderId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        orgId: testOrgId,
        status: "under_review",
        reason: "product_defective",
        description: "Detailed test claim",
        requestedAmount: 100,
        evidence: [
          {
            type: "image",
            url: "https://storage.example.com/evidence1.jpg",
            uploadedAt: new Date(),
          },
        ],
        timeline: [
          { event: "created", timestamp: new Date(), by: testBuyerId },
          {
            event: "evidence_uploaded",
            timestamp: new Date(),
            by: testBuyerId,
          },
        ],
        testData: true,
        createdAt: new Date(),
      });
      testClaimId = claimResult.insertedId;
    });

    it("should return complete claim details", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}`,
        {
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id).toBe(testClaimId.toString());
      expect(data.evidence).toHaveLength(1);
      expect(data.timeline).toHaveLength(2);
    });

    it("should populate order and user details", async () => {
      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}?populate=order,buyer,seller`,
        {
          headers: {
            "x-user-id": testBuyerId.toString(),
          "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.order).toBeDefined();
      expect(data.buyer).toBeDefined();
      expect(data.seller).toBeDefined();
    });

    it("should restrict access to authorized users", async () => {
      const unauthorizedId = new ObjectId();

      const response = await fetch(
        `http://localhost:3000/api/souq/claims/${testClaimId.toString()}`,
        {
          headers: {
            "x-user-id": unauthorizedId.toString(),
            "x-user-org-id": testOrgId.toString(),
          },
        },
      );

      // Claim found but user is not buyer/seller - returns 403 Forbidden
      expect(response.status).toBe(403);
    });
  });
});
