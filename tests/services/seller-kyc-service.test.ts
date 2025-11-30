import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { Types } from "mongoose";
import { nanoid } from "nanoid";

// Hoist mock setup
const { mockAddJob } = vi.hoisted(() => ({
  mockAddJob: vi.fn(async () => undefined),
}));

// Mock external dependencies
vi.mock("@/lib/queues/setup", () => ({
  addJob: mockAddJob,
  QUEUE_NAMES: { NOTIFICATIONS: "notifications", KYC: "kyc" },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import models after mocks
import { SouqSeller } from "@/server/models/souq/Seller";

// Deferred service import
let sellerKYCService: typeof import("@/services/souq/seller-kyc-service").sellerKYCService;

/**
 * Helper to create a minimal seller for KYC testing
 */
async function seedPendingSeller({
  orgId = "org-test",
  kycStatus = "pending",
} = {}) {
  const sellerId = new Types.ObjectId();
  
  await SouqSeller.create({
    _id: sellerId,
    sellerId: `SEL-${nanoid(8)}`,
    orgId,
    legalName: `Seller-${nanoid(6)}`,
    tradeName: `Trade-${nanoid(6)}`,
    crNumber: `CR-${nanoid(8)}`,
    vatNumber: `VAT-${nanoid(8)}`,
    registrationType: "company",
    country: "SA",
    city: "Riyadh",
    address: "123 Test Street",
    contactEmail: `contact-${nanoid(4)}@test.com`,
    contactPhone: "+966500000001",
    kycStatus: {
      status: kycStatus,
      step: "company_info",
      companyInfoComplete: false,
      documentsComplete: false,
      bankDetailsComplete: false,
    },
    accountHealth: {
      orderDefectRate: 0,
      lateShipmentRate: 0,
      cancellationRate: 0,
      validTrackingRate: 100,
      onTimeDeliveryRate: 100,
      score: 100,
      status: "excellent",
      lastCalculated: new Date(),
    },
    tier: "professional",
    tierEffectiveFrom: new Date(),
    autoRepricerSettings: { enabled: false, rules: {} },
  });

  return { sellerId: sellerId.toString() };
}

afterEach(async () => {
  await SouqSeller.deleteMany({});
  vi.clearAllMocks();
});

beforeAll(async () => {
  ({ sellerKYCService } = await import("@/services/souq/seller-kyc-service"));
});

describe("sellerKYCService", () => {
  describe("startKYCProcess", () => {
    it("should initialize KYC process for new seller", async () => {
      if (sellerKYCService.startKYCProcess) {
        const companyInfo = {
          businessName: "Test Business",
          crNumber: "CR-12345678",
          businessType: "company" as const,
          industry: "retail",
          description: "Test company description",
          contactEmail: "test@test.com",
          contactPhone: "+966501234567",
          businessAddress: {
            street: "123 Test St",
            city: "Riyadh",
            state: "Riyadh",
            postalCode: "12345",
            country: "SA",
          },
        };

        const result = await sellerKYCService.startKYCProcess(companyInfo);
        
        expect(result).toHaveProperty("sellerId");
        expect(result.kycStatus).toBe("pending");
      }
    });
  });

  describe("submitDocument", () => {
    it("should accept valid document submission", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "pending" });
      
      if (sellerKYCService.submitDocument) {
        const document = {
          type: "commercialRegistration" as const,
          fileUrl: "https://example.com/cr.pdf",
          fileType: "pdf" as const,
        };

        const result = await sellerKYCService.submitDocument(sellerId, document);
        
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid document type", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "pending" });
      
      if (sellerKYCService.submitDocument) {
        const document = {
          type: "invalid" as "commercialRegistration",
          fileUrl: "https://example.com/file.pdf",
          fileType: "pdf" as const,
        };

        await expect(
          sellerKYCService.submitDocument(sellerId, document)
        ).rejects.toThrow();
      }
    });
  });

  describe("verifyDocument", () => {
    it("should mark document as verified", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "in_review" });
      
      // Add a document to the seller first - type must match what's expected in the model
      // The service looks for documents by DOCUMENT_TYPE_MAP[key] where key is "commercialRegistration" -> "cr"
      await SouqSeller.findByIdAndUpdate(sellerId, {
        documents: [{
          type: "cr", // stored type
          url: "https://example.com/cr.pdf",
          uploadedAt: new Date(),
          verified: false,
        }]
      });

      if (sellerKYCService.verifyDocument) {
        // verifyDocument takes documentType as "commercialRegistration" (the key, not the stored type)
        await sellerKYCService.verifyDocument({
          sellerId,
          documentType: "commercialRegistration", // This maps to "cr" internally
          approved: true,
          verifiedBy: "admin-user-123",
        });
        
        const seller = await SouqSeller.findById(sellerId);
        const doc = seller?.documents?.find(d => d.type === "cr");
        expect(doc?.verified).toBe(true);
      }
    });

    it("should reject document with reason", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "in_review" });
      
      // Add a document to the seller first
      await SouqSeller.findByIdAndUpdate(sellerId, {
        documents: [{
          type: "cr", // stored type
          url: "https://example.com/cr.pdf",
          uploadedAt: new Date(),
          verified: false,
        }]
      });
      
      if (sellerKYCService.verifyDocument) {
        await sellerKYCService.verifyDocument({
          sellerId,
          documentType: "commercialRegistration", // This maps to "cr" internally
          approved: false,
          verifiedBy: "admin-user-123",
          rejectionReason: "Document expired",
        });
        
        const seller = await SouqSeller.findById(sellerId);
        const doc = seller?.documents?.find(d => d.type === "cr");
        expect(doc?.verified).toBe(false);
        expect(doc?.rejectionReason).toBe("Document expired");
      }
    });
  });

  describe("getKYCStatus", () => {
    it("should return current KYC status", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "pending" });
      
      if (sellerKYCService.getKYCStatus) {
        const result = await sellerKYCService.getKYCStatus(sellerId);
        
        // Service returns {status, step, companyInfoComplete, documentsComplete, bankDetailsComplete}
        expect(result.status).toBe("pending");
        expect(result).toHaveProperty("step");
        expect(result).toHaveProperty("companyInfoComplete");
        expect(result).toHaveProperty("documentsComplete");
        expect(result).toHaveProperty("bankDetailsComplete");
      }
    });

    it("should throw for non-existent seller", async () => {
      const fakeSellerId = new Types.ObjectId().toString();
      
      if (sellerKYCService.getKYCStatus) {
        // Service throws "Seller not found" for non-existent sellers
        await expect(sellerKYCService.getKYCStatus(fakeSellerId)).rejects.toThrow("Seller not found");
      }
    });
  });

  describe("approveKYC", () => {
    it("should approve seller KYC", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "under_review" });
      
      if (sellerKYCService.approveKYC) {
        // approveKYC returns void
        await sellerKYCService.approveKYC(sellerId, "admin-user-123");
        
        const seller = await SouqSeller.findById(sellerId);
        expect(seller?.kycStatus?.status).toBe("approved");
        expect(seller?.isActive).toBe(true);
      }
    });

    it("should send notification on approval", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "under_review" });
      
      if (sellerKYCService.approveKYC) {
        await sellerKYCService.approveKYC(sellerId, "admin-user-123");
        
        // Should send approval email and welcome guide
        expect(mockAddJob).toHaveBeenCalled();
      }
    });
  });

  describe("rejectKYC", () => {
    it("should reject seller KYC with reason", async () => {
      const { sellerId } = await seedPendingSeller({ kycStatus: "under_review" });
      
      if (sellerKYCService.rejectKYC) {
        // rejectKYC takes (sellerId, rejectedBy, reason) and returns void
        await sellerKYCService.rejectKYC(
          sellerId,
          "admin-user-123",
          "Documents do not match business registration"
        );
        
        const seller = await SouqSeller.findById(sellerId);
        expect(seller?.kycStatus?.status).toBe("rejected");
        expect(seller?.kycStatus?.rejectionReason).toBe("Documents do not match business registration");
      }
    });
  });

  describe("getPendingKYCSubmissions", () => {
    it("should return pending KYC applications", async () => {
      await seedPendingSeller({ kycStatus: "in_review" });
      await seedPendingSeller({ kycStatus: "in_review" });
      await seedPendingSeller({ kycStatus: "approved" });
      
      if (sellerKYCService.getPendingKYCSubmissions) {
        const queue = await sellerKYCService.getPendingKYCSubmissions();
        
        expect(queue.length).toBe(2);
        expect(queue[0]).toHaveProperty("sellerId");
        expect(queue[0]).toHaveProperty("waitingDays");
      }
    });
  });

  describe("validateCRNumber", () => {
    it("should validate Saudi CR number format", async () => {
      if (sellerKYCService.validateCRNumber) {
        const validCR = "1010123456"; // 10 digits starting with 10
        const invalidCR = "123456";
        
        await expect(sellerKYCService.validateCRNumber(validCR)).resolves.toBe(true);
        await expect(sellerKYCService.validateCRNumber(invalidCR)).rejects.toThrow();
      }
    });
  });

  describe("validateVATNumber", () => {
    it("should validate Saudi VAT number format", async () => {
      if (sellerKYCService.validateVATNumber) {
        const validVAT = "300012345678901"; // 15 digits
        const invalidVAT = "12345";
        
        expect(sellerKYCService.validateVATNumber(validVAT)).toBe(true);
        expect(sellerKYCService.validateVATNumber(invalidVAT)).toBe(false);
      }
    });
  });
});
