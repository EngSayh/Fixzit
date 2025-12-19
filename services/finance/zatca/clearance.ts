import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import { fetchWithRetry } from "@/lib/http/fetchWithRetry";

type InvoiceLike = {
  number?: string;
  issueDate?: Date | string;
  total?: number | null;
  tax?: number | null;
  currency?: string;
  description?: string | null;
  issuer?: {
    name?: string | null;
    taxId?: string | null;
    address?: string | null;
  } | null;
};

export type ZatcaInvoicePayload = {
  invoiceType: "SIMPLIFIED" | "STANDARD";
  invoiceNumber: string;
  issueDate: string;
  seller: {
    name: string;
    vatNumber: string;
    address: string;
  };
  total: string;
  currency: string;
  vatAmount: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
};

export type ZatcaClearanceResult = {
  clearanceStatus: string;
  clearanceId: string;
  qrCode: string;
  invoiceHash?: string;
  raw: Record<string, unknown>;
};

const DEFAULT_VAT_RATE = 0.15;

const normalizeNumber = (value: number | null | undefined, fallback = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
};

const requireValue = (label: string, value: string | undefined) => {
  if (!value || !value.trim()) {
    throw new Error(`ZATCA ${label} is required for clearance`);
  }
  return value.trim();
};

export function buildZatcaInvoicePayload(invoice: InvoiceLike): ZatcaInvoicePayload {
  const sellerName = requireValue(
    "seller name",
    invoice.issuer?.name || process.env.ZATCA_SELLER_NAME,
  );
  const vatNumber = requireValue(
    "VAT number",
    invoice.issuer?.taxId || process.env.ZATCA_VAT_NUMBER,
  );
  const sellerAddress = requireValue(
    "seller address",
    invoice.issuer?.address || process.env.ZATCA_SELLER_ADDRESS,
  );

  const total = normalizeNumber(invoice.total);
  if (total <= 0) {
    throw new Error("Invoice total must be greater than zero for ZATCA clearance");
  }

  const taxAmount = normalizeNumber(invoice.tax);
  const vatRate = taxAmount > 0 ? Math.min(taxAmount / total, 1) : DEFAULT_VAT_RATE;

  const issueDate =
    invoice.issueDate instanceof Date
      ? invoice.issueDate.toISOString()
      : typeof invoice.issueDate === "string" && invoice.issueDate
        ? new Date(invoice.issueDate).toISOString()
        : new Date().toISOString();

  return {
    invoiceType: "SIMPLIFIED",
    invoiceNumber: invoice.number || `INV-${Date.now()}`,
    issueDate,
    seller: {
      name: sellerName,
      vatNumber,
      address: sellerAddress,
    },
    total: total.toFixed(2),
    currency: invoice.currency || "SAR",
    vatAmount: taxAmount.toFixed(2),
    items: [
      {
        description: invoice.description || "Invoice",
        quantity: 1,
        unitPrice: total,
        vatRate,
      },
    ],
  };
}

export async function submitInvoiceForClearance(
  invoice: InvoiceLike,
): Promise<ZatcaClearanceResult> {
  const apiKey = requireValue("API key", process.env.ZATCA_API_KEY);
  const payload = buildZatcaInvoicePayload(invoice);

  const response = await fetchWithRetry(
    SERVICE_RESILIENCE.zatca.clearanceApiUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: SERVICE_RESILIENCE.zatca.timeouts.clearanceMs,
      maxAttempts: SERVICE_RESILIENCE.zatca.retries.maxAttempts,
      retryDelayMs: SERVICE_RESILIENCE.zatca.retries.baseDelayMs,
      label: "zatca-clearance",
    },
  );

  const responseBody = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new Error(
      `ZATCA clearance failed (${response.status}): ${JSON.stringify(responseBody)}`,
    );
  }

  const clearanceStatus = String(responseBody.clearanceStatus || "");
  const clearanceId = String(responseBody.clearanceId || responseBody.uuid || "");
  const qrCode = String(responseBody.qrCode || "");
  const invoiceHash =
    typeof responseBody.invoiceHash === "string" ? responseBody.invoiceHash : undefined;

  if (!clearanceStatus) {
    throw new Error("ZATCA clearance response missing status");
  }
  if (clearanceStatus !== "CLEARED") {
    throw new Error(`ZATCA clearance not approved: ${clearanceStatus}`);
  }
  if (!clearanceId || !qrCode) {
    throw new Error("ZATCA clearance response missing required fields");
  }

  return {
    clearanceStatus,
    clearanceId,
    qrCode,
    invoiceHash,
    raw: responseBody,
  };
}
