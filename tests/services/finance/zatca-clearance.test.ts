/**
 * @fileoverview Tests for ZATCA clearance service
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildZatcaInvoicePayload,
  submitInvoiceForClearance,
} from "@/services/finance/zatca/clearance";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

vi.mock("@/lib/http/fetchWithRetry", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "@/lib/http/fetchWithRetry";

const baseInvoice = {
  number: "INV-1001",
  issueDate: new Date("2025-01-01T10:00:00.000Z"),
  total: 1000,
  tax: 150,
  currency: "SAR",
  description: "Service invoice",
  issuer: {
    name: "Fixzit",
    taxId: "300000000000003",
    address: "Riyadh, KSA",
  },
};

describe("ZATCA clearance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestMocks();
    process.env.ZATCA_API_KEY = "test-key";
    process.env.ZATCA_SELLER_NAME = "Fixzit";
    process.env.ZATCA_VAT_NUMBER = "300000000000003";
    process.env.ZATCA_SELLER_ADDRESS = "Riyadh, KSA";
  });

  it("builds ZATCA payload with issuer fields", () => {
    const payload = buildZatcaInvoicePayload(baseInvoice);
    expect(payload.invoiceNumber).toBe("INV-1001");
    expect(payload.seller.name).toBe("Fixzit");
    expect(payload.seller.vatNumber).toBe("300000000000003");
    expect(payload.vatAmount).toBe("150.00");
    expect(payload.total).toBe("1000.00");
  });

  it("submits invoice for clearance and returns response", async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(
        JSON.stringify({
          clearanceStatus: "CLEARED",
          clearanceId: "clear-123",
          qrCode: "qr-base64",
          invoiceHash: "hash-abc",
        }),
        { status: 200 },
      ),
    );

    const result = await submitInvoiceForClearance(baseInvoice);
    expect(fetchWithRetry).toHaveBeenCalled();
    expect(result.clearanceStatus).toBe("CLEARED");
    expect(result.clearanceId).toBe("clear-123");
    expect(result.qrCode).toBe("qr-base64");
    expect(result.invoiceHash).toBe("hash-abc");
  });

  it("throws when clearance response is not ok", async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 }),
    );

    await expect(submitInvoiceForClearance(baseInvoice)).rejects.toThrow(
      "ZATCA clearance failed",
    );
  });

  it("throws when clearance status is not CLEARED", async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(
        JSON.stringify({
          clearanceStatus: "REJECTED",
          clearanceId: "clear-123",
          qrCode: "qr-base64",
        }),
        { status: 200 },
      ),
    );

    await expect(submitInvoiceForClearance(baseInvoice)).rejects.toThrow(
      "ZATCA clearance not approved",
    );
  });
});
