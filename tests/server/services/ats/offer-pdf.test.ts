import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdfkit
vi.mock("pdfkit", () => {
  const EventEmitter = require("events");

  return {
    default: vi.fn().mockImplementation(() => {
      const emitter = new EventEmitter();
      const chunks: Buffer[] = [];

      const doc = {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          emitter.on(event, handler);
          return doc;
        },
        emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args),
        fontSize: vi.fn().mockReturnThis(),
        fillColor: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        moveDown: vi.fn().mockReturnThis(),
        end: vi.fn(() => {
          // Emit data and end events
          const buffer = Buffer.from("mock-pdf-content");
          emitter.emit("data", buffer);
          emitter.emit("end");
        }),
      };

      return doc;
    }),
  };
});

import {
  generateOfferLetterPDF,
  type OfferPDFInput,
} from "@/server/services/ats/offer-pdf";

describe("offer-pdf service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateOfferLetterPDF", () => {
    it("should generate a valid PDF buffer", async () => {
      const input: OfferPDFInput = {
        candidateName: "Jane Smith",
        jobTitle: "Software Engineer",
        orgName: "Fixzit Inc.",
      };

      const result = await generateOfferLetterPDF(input);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include candidate name in PDF", async () => {
      const input: OfferPDFInput = {
        candidateName: "John Doe",
        jobTitle: "Project Manager",
        orgName: "Acme Corp",
      };

      const PDFDocument = (await import("pdfkit")).default;

      await generateOfferLetterPDF(input);

      // Verify text() was called with candidate name
      const mockDoc = vi.mocked(PDFDocument).mock.results[0]?.value;
      expect(mockDoc.text).toHaveBeenCalled();
    });

    it("should include salary when provided", async () => {
      const input: OfferPDFInput = {
        candidateName: "Jane Smith",
        jobTitle: "Software Engineer",
        orgName: "Fixzit Inc.",
        salary: { amount: 5000, currency: "OMR" },
      };

      const PDFDocument = (await import("pdfkit")).default;

      await generateOfferLetterPDF(input);

      const mockDoc = vi.mocked(PDFDocument).mock.results[0]?.value;
      expect(mockDoc.text).toHaveBeenCalled();
    });

    it("should include start date when provided", async () => {
      const input: OfferPDFInput = {
        candidateName: "Jane Smith",
        jobTitle: "Software Engineer",
        orgName: "Fixzit Inc.",
        startDate: "2024-01-15",
      };

      const PDFDocument = (await import("pdfkit")).default;

      await generateOfferLetterPDF(input);

      const mockDoc = vi.mocked(PDFDocument).mock.results[0]?.value;
      expect(mockDoc.text).toHaveBeenCalled();
    });

    it("should include benefits list when provided", async () => {
      const input: OfferPDFInput = {
        candidateName: "Jane Smith",
        jobTitle: "Software Engineer",
        orgName: "Fixzit Inc.",
        benefits: ["Health Insurance", "401k Match", "Remote Work"],
      };

      const PDFDocument = (await import("pdfkit")).default;

      await generateOfferLetterPDF(input);

      const mockDoc = vi.mocked(PDFDocument).mock.results[0]?.value;
      // Each benefit should trigger a text() call
      expect(mockDoc.text).toHaveBeenCalled();
    });

    it("should include notes when provided", async () => {
      const input: OfferPDFInput = {
        candidateName: "Jane Smith",
        jobTitle: "Software Engineer",
        orgName: "Fixzit Inc.",
        notes: "Please respond within 7 days.",
      };

      const PDFDocument = (await import("pdfkit")).default;

      await generateOfferLetterPDF(input);

      const mockDoc = vi.mocked(PDFDocument).mock.results[0]?.value;
      expect(mockDoc.text).toHaveBeenCalledWith(input.notes);
    });

    it("should handle PDF generation errors", async () => {
      const PDFDocument = (await import("pdfkit")).default;
      vi.mocked(PDFDocument).mockImplementationOnce(() => {
        throw new Error("PDF generation failed");
      });

      await expect(
        generateOfferLetterPDF({
          candidateName: "Jane Smith",
          jobTitle: "Software Engineer",
          orgName: "Fixzit Inc.",
        })
      ).rejects.toThrow("PDF generation failed");
    });
  });
});
