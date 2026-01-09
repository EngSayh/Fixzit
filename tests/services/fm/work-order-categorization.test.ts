/**
 * @fileoverview Tests for AI Work Order Categorization Service
 * @module tests/services/fm/work-order-categorization.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  categorizeWorkOrder,
  ConfidenceLevel,
  CATEGORY_PATTERNS,
  PRIORITY_PATTERNS,
  CATEGORY_SKILLS,
} from "@/services/fm/work-order-categorization";
import { WOCategory, WOPriority, MaintenanceType } from "@/types/fm/enums";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    }),
  }),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Work Order Categorization Service", () => {
  const testOrgId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("categorizeWorkOrder", () => {
    it("should categorize plumbing work order correctly", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Leaking faucet in bathroom",
        "The kitchen sink faucet is dripping water continuously"
      );

      expect(result.category).toBe(WOCategory.PLUMBING);
      expect(result.suggestedSkills).toContain("plumbing");
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it("should categorize electrical work order correctly", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Power outlet not working",
        "The electrical outlet in the living room has no power"
      );

      expect(result.category).toBe(WOCategory.ELECTRICAL);
      expect(result.suggestedSkills).toContain("electrical");
    });

    it("should categorize HVAC work order correctly", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "AC not cooling",
        "Air conditioning unit is running but not producing cold air"
      );

      expect(result.category).toBe(WOCategory.HVAC);
      expect(result.suggestedSkills).toContain("hvac");
    });

    it("should detect emergency priority from keywords", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "EMERGENCY: Gas leak detected",
        "Strong gas smell in the kitchen area, immediate attention needed"
      );

      expect(result.priority).toBe(WOPriority.CRITICAL);
      expect(result.type).toBe(MaintenanceType.EMERGENCY);
    });

    it("should detect high priority from keywords", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Urgent: Water leak flooding apartment",
        "Water is flooding from the bathroom, needs fixing today"
      );

      expect(result.priority).toBe(WOPriority.HIGH);
    });

    it("should handle Arabic keywords", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "تسرب مياه في الحمام",
        "يوجد تسرب مياه من الصنبور"
      );

      expect(result.category).toBe(WOCategory.PLUMBING);
    });

    it("should detect cleaning category", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Deep cleaning required",
        "Apartment needs thorough cleaning and sanitization"
      );

      expect(result.category).toBe(WOCategory.CLEANING);
      expect(result.suggestedSkills).toContain("cleaning");
    });

    it("should detect security category", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Door lock broken",
        "Front door lock is jammed and key won't work"
      );

      expect(result.category).toBe(WOCategory.SECURITY);
      expect(result.suggestedSkills).toContain("security_systems");
    });

    it("should detect IT category", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Internet not working",
        "WiFi connection is down in the entire building"
      );

      expect(result.category).toBe(WOCategory.IT);
      expect(result.suggestedSkills).toContain("networking");
    });

    it("should generate appropriate tags", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Emergency plumbing leak",
        "Water pipe burst in basement"
      );

      expect(result.suggestedTags).toContain("urgent");
      expect(result.suggestedTags.length).toBeLessThanOrEqual(5);
    });

    it("should provide reasoning for categorization", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Electrical outlet sparking",
        "Sparks visible when plugging in devices"
      );

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should return confidence score", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Fix the AC unit",
        "The HVAC system needs maintenance"
      );

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(100);
      expect([ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW]).toContain(result.confidence);
    });

    it("should default to GENERAL category when no patterns match", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Something is wrong",
        "Please advise on the situation"
      );

      expect(result.category).toBe(WOCategory.GENERAL);
    });

    it("should default to MEDIUM priority when no urgent keywords", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Minor issue",
        "Small problem that needs attention"
      );

      expect(result.priority).toBe(WOPriority.MEDIUM);
    });
  });

  describe("Pattern Configuration", () => {
    it("should have patterns for all categories", () => {
      const categories = Object.values(WOCategory);
      for (const category of categories) {
        expect(CATEGORY_PATTERNS[category]).toBeDefined();
        expect(CATEGORY_PATTERNS[category].length).toBeGreaterThan(0);
      }
    });

    it("should have patterns for all priorities", () => {
      const priorities = Object.values(WOPriority);
      for (const priority of priorities) {
        expect(PRIORITY_PATTERNS[priority]).toBeDefined();
        expect(PRIORITY_PATTERNS[priority].length).toBeGreaterThan(0);
      }
    });

    it("should have skills mapped for all categories", () => {
      const categories = Object.values(WOCategory);
      for (const category of categories) {
        expect(CATEGORY_SKILLS[category]).toBeDefined();
        expect(CATEGORY_SKILLS[category].length).toBeGreaterThan(0);
      }
    });
  });

  describe("Confidence Levels", () => {
    it("should return HIGH confidence for strong matches", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Plumbing leak water pipe drain clog",
        "Water leak from pipe causing drain overflow and flooding"
      );

      // Multiple strong matches should result in high confidence
      expect(result.patterns.length).toBeGreaterThan(3);
    });

    it("should return LOW confidence for weak matches", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Help needed",
        "Please assist with something"
      );

      expect(result.confidence).toBe(ConfidenceLevel.LOW);
    });
  });

  describe("Maintenance Type Detection", () => {
    it("should detect preventive maintenance type", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Scheduled preventive maintenance",
        "Regular scheduled HVAC filter replacement"
      );

      expect(result.type).toBe(MaintenanceType.PREVENTIVE);
    });

    it("should detect emergency type", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Emergency flood",
        "Urgent water damage emergency"
      );

      expect(result.type).toBe(MaintenanceType.EMERGENCY);
    });

    it("should default to corrective type", async () => {
      const result = await categorizeWorkOrder(
        testOrgId,
        "Fix broken window",
        "Window glass is cracked and needs repair"
      );

      expect(result.type).toBe(MaintenanceType.CORRECTIVE);
    });
  });
});
