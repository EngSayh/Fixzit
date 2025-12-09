const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultResilience = {
  timeouts: {
    smsSendMs: toNumber(process.env.SMS_TIMEOUT_MS, 10_000),
    statusMs: toNumber(process.env.SMS_STATUS_TIMEOUT_MS, 5_000),
    balanceMs: toNumber(process.env.SMS_BALANCE_TIMEOUT_MS, 5_000),
  },
  retries: {
    maxAttempts: toNumber(process.env.SMS_MAX_ATTEMPTS, 3),
    baseDelayMs: toNumber(process.env.SMS_RETRY_DELAY_MS, 500),
  },
};

export const SERVICE_RESILIENCE = {
  paytabs: {
    timeouts: {
      paymentMs: toNumber(process.env.PAYTABS_TIMEOUT_MS, 15_000),
      payoutMs: toNumber(process.env.PAYTABS_PAYOUT_TIMEOUT_MS, 15_000),
      verifyMs: toNumber(process.env.PAYTABS_VERIFY_TIMEOUT_MS, 8_000),
      refundMs: toNumber(process.env.PAYTABS_REFUND_TIMEOUT_MS, 12_000),
    },
    retries: {
      maxAttempts: toNumber(process.env.PAYTABS_MAX_ATTEMPTS, 3),
      baseDelayMs: toNumber(process.env.PAYTABS_RETRY_DELAY_MS, 750),
    },
  },
  // Taqnyat - ONLY production SMS provider (CITC-compliant for Saudi Arabia)
  taqnyat: {
    timeouts: {
      smsSendMs: toNumber(process.env.TAQNYAT_TIMEOUT_MS, 10_000),
      statusMs: toNumber(process.env.TAQNYAT_STATUS_TIMEOUT_MS, 5_000),
      balanceMs: toNumber(process.env.TAQNYAT_BALANCE_TIMEOUT_MS, 5_000),
    },
    retries: {
      maxAttempts: toNumber(process.env.TAQNYAT_MAX_ATTEMPTS, 3),
      baseDelayMs: toNumber(process.env.TAQNYAT_RETRY_DELAY_MS, 500),
    },
  },
  meilisearch: {
    timeouts: {
      searchMs: toNumber(process.env.MEILI_SEARCH_TIMEOUT_MS, 3_000),
      indexingMs: toNumber(process.env.MEILI_INDEXING_TIMEOUT_MS, 5_000),
    },
    retries: {
      maxAttempts: toNumber(process.env.MEILI_MAX_ATTEMPTS, 3),
      baseDelayMs: toNumber(process.env.MEILI_RETRY_DELAY_MS, 400),
    },
  },
  zatca: {
    // Centralized ZATCA API URL - avoids duplication across files
    clearanceApiUrl:
      process.env.ZATCA_CLEARANCE_API_URL ||
      "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single",
    timeouts: {
      clearanceMs: toNumber(process.env.ZATCA_TIMEOUT_MS, 10_000),
    },
    retries: {
      maxAttempts: 3,
      baseDelayMs: 1_000,
    },
  },
  twilio: defaultResilience,
  unifonic: defaultResilience,
  "aws-sns": defaultResilience,
  nexmo: defaultResilience,
} as const;

export type ServiceResilienceKey = keyof typeof SERVICE_RESILIENCE;
