/**
 * @fileoverview Live Currency Conversion Service
 * @module services/finance/currency-service
 *
 * LOGIC-003: Implements live currency conversion with caching
 * - Fetches rates from external API (exchangerate-api.com)
 * - Caches rates with configurable TTL
 * - Fallback to stored rates if API unavailable
 * - Supports all major currencies
 *
 * @status PRODUCTION
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Configuration
// ============================================================================

export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  timestamp: Date;
  source: "live" | "cached" | "fallback";
}

export interface CurrencyConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  rateSource: "live" | "cached" | "fallback";
  convertedAt: Date;
}

interface CachedRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: Date;
  expiresAt: Date;
}

// Default TTL for cached rates (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

// Fallback rates (updated monthly, used when API unavailable)
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  SAR: {
    USD: 0.2667,
    EUR: 0.2453,
    GBP: 0.2107,
    AED: 0.9793,
    KWD: 0.0821,
    BHD: 0.1005,
    QAR: 0.9712,
    OMR: 0.1027,
    EGP: 8.2667,
    JOD: 0.1891,
  },
  USD: {
    SAR: 3.75,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
    KWD: 0.308,
    BHD: 0.377,
    QAR: 3.64,
    OMR: 0.385,
    EGP: 31.0,
    JOD: 0.709,
  },
};

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached exchange rates from database
 */
async function getCachedRates(base: string): Promise<CachedRates | null> {
  try {
    const db = await getDatabase();
    // Currency rates collection - not in COLLECTIONS constant yet
    const cached = await db.collection("currency_rates").findOne({
      base,
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return {
        base: cached.base as string,
        rates: cached.rates as Record<string, number>,
        fetchedAt: cached.fetchedAt as Date,
        expiresAt: cached.expiresAt as Date,
      };
    }
    return null;
  } catch (error) {
    logger.warn("[CurrencyService] Failed to get cached rates", { base, error });
    return null;
  }
}

/**
 * Store exchange rates in cache
 */
async function setCachedRates(
  base: string,
  rates: Record<string, number>
): Promise<void> {
  try {
    const db = await getDatabase();
    const now = new Date();

    // Currency rates collection - not in COLLECTIONS constant yet
    await db.collection("currency_rates").updateOne(
      { base },
      {
        $set: {
          rates,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    logger.warn("[CurrencyService] Failed to cache rates", { base, error });
  }
}

// ============================================================================
// API Integration
// ============================================================================

/**
 * Fetch live exchange rates from external API
 */
async function fetchLiveRates(base: string): Promise<Record<string, number> | null> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  
  if (!apiKey) {
    logger.warn("[CurrencyService] No API key configured, using fallback rates");
    return null;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`,
      {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      logger.warn("[CurrencyService] API request failed", {
        status: response.status,
        base,
      });
      return null;
    }

    const data = await response.json();

    if (data.result !== "success") {
      logger.warn("[CurrencyService] API returned error", {
        error: data["error-type"],
        base,
      });
      return null;
    }

    return data.conversion_rates as Record<string, number>;
  } catch (error) {
    logger.warn("[CurrencyService] API request error", { base, error });
    return null;
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<ExchangeRate> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  // Same currency
  if (fromUpper === toUpper) {
    return {
      base: fromUpper,
      target: toUpper,
      rate: 1,
      timestamp: new Date(),
      source: "live",
    };
  }

  // Try cached rates first
  const cached = await getCachedRates(fromUpper);
  if (cached && cached.rates[toUpper]) {
    return {
      base: fromUpper,
      target: toUpper,
      rate: cached.rates[toUpper],
      timestamp: cached.fetchedAt,
      source: "cached",
    };
  }

  // Fetch live rates
  const liveRates = await fetchLiveRates(fromUpper);
  if (liveRates && liveRates[toUpper]) {
    // Cache the rates
    await setCachedRates(fromUpper, liveRates);

    return {
      base: fromUpper,
      target: toUpper,
      rate: liveRates[toUpper],
      timestamp: new Date(),
      source: "live",
    };
  }

  // Fallback to hardcoded rates
  const fallbackRates = FALLBACK_RATES[fromUpper];
  if (fallbackRates && fallbackRates[toUpper]) {
    return {
      base: fromUpper,
      target: toUpper,
      rate: fallbackRates[toUpper],
      timestamp: new Date(),
      source: "fallback",
    };
  }

  // Try inverse rate
  const inverseFallback = FALLBACK_RATES[toUpper];
  if (inverseFallback && inverseFallback[fromUpper]) {
    return {
      base: fromUpper,
      target: toUpper,
      rate: 1 / inverseFallback[fromUpper],
      timestamp: new Date(),
      source: "fallback",
    };
  }

  // No rate available
  throw new Error(`No exchange rate available for ${fromUpper} to ${toUpper}`);
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversionResult> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);

  const convertedAmount = Math.round(amount * rate.rate * 100) / 100;

  return {
    fromAmount: amount,
    fromCurrency: fromCurrency.toUpperCase(),
    toAmount: convertedAmount,
    toCurrency: toCurrency.toUpperCase(),
    rate: rate.rate,
    rateSource: rate.source,
    convertedAt: new Date(),
  };
}

/**
 * Get all available rates for a base currency
 */
export async function getAllRates(baseCurrency: string): Promise<{
  base: string;
  rates: Record<string, number>;
  source: "live" | "cached" | "fallback";
  timestamp: Date;
}> {
  const baseUpper = baseCurrency.toUpperCase();

  // Try cached rates
  const cached = await getCachedRates(baseUpper);
  if (cached) {
    return {
      base: baseUpper,
      rates: cached.rates,
      source: "cached",
      timestamp: cached.fetchedAt,
    };
  }

  // Fetch live rates
  const liveRates = await fetchLiveRates(baseUpper);
  if (liveRates) {
    await setCachedRates(baseUpper, liveRates);
    return {
      base: baseUpper,
      rates: liveRates,
      source: "live",
      timestamp: new Date(),
    };
  }

  // Fallback
  const fallback = FALLBACK_RATES[baseUpper];
  if (fallback) {
    return {
      base: baseUpper,
      rates: fallback,
      source: "fallback",
      timestamp: new Date(),
    };
  }

  throw new Error(`No rates available for base currency: ${baseUpper}`);
}

/**
 * Refresh cached rates (call from cron job)
 */
export async function refreshRates(baseCurrencies: string[] = ["SAR", "USD"]): Promise<{
  refreshed: string[];
  failed: string[];
}> {
  const refreshed: string[] = [];
  const failed: string[] = [];

  for (const base of baseCurrencies) {
    const rates = await fetchLiveRates(base);
    if (rates) {
      await setCachedRates(base, rates);
      refreshed.push(base);
    } else {
      failed.push(base);
    }
  }

  logger.info("[CurrencyService] Rates refresh completed", { refreshed, failed });

  return { refreshed, failed };
}
