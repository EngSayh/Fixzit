const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  twilio: {
    timeouts: {
      smsSendMs: toNumber(process.env.TWILIO_TIMEOUT_MS, 10_000),
      statusMs: toNumber(process.env.TWILIO_STATUS_TIMEOUT_MS, 5_000),
    },
    retries: {
      maxAttempts: toNumber(process.env.TWILIO_MAX_ATTEMPTS, 3),
      baseDelayMs: toNumber(process.env.TWILIO_RETRY_DELAY_MS, 500),
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
    timeouts: {
      clearanceMs: toNumber(process.env.ZATCA_TIMEOUT_MS, 10_000),
    },
    retries: {
      maxAttempts: 3,
      baseDelayMs: 1_000,
    },
  },
} as const;

export type ServiceResilienceKey = keyof typeof SERVICE_RESILIENCE;
