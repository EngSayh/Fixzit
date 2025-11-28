/**
 * Pricing Utilities
 *
 * Common pricing calculations and utilities used across the application
 */

export interface PriceCalculation {
  basePrice: number;
  discount: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
  tax?: number;
  taxAmount?: number;
  totalWithTax?: number;
}

export interface PricingTier {
  name: string;
  tier: number;
  discountPercentage: number;
  minimumOrderValue?: number;
}

/**
 * Calculate price with discount applied
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountPercentage: number,
): PriceCalculation {
  const discount = Math.max(0, Math.min(100, discountPercentage));
  const discountAmount = (basePrice * discount) / 100;
  const finalPrice = basePrice - discountAmount;

  return {
    basePrice,
    discount,
    discountAmount,
    finalPrice,
    savings: discountAmount,
  };
}

/**
 * Calculate price with tax
 */
export function calculatePriceWithTax(
  price: number,
  taxPercentage: number = 15, // VAT in Saudi Arabia
): { price: number; taxAmount: number; totalWithTax: number } {
  const taxAmount = (price * taxPercentage) / 100;
  const totalWithTax = price + taxAmount;

  return {
    price,
    taxAmount,
    totalWithTax,
  };
}

/**
 * Get applicable pricing tier based on order value
 */
export function getApplicableTier(
  orderValue: number,
  availableTiers: PricingTier[],
): PricingTier | null {
  const applicableTiers = availableTiers
    .filter(
      (tier) => !tier.minimumOrderValue || orderValue >= tier.minimumOrderValue,
    )
    .sort((a, b) => b.discountPercentage - a.discountPercentage);

  return applicableTiers[0] || null;
}

/**
 * Calculate bulk pricing with quantity discounts
 */
export function calculateBulkPricing(
  unitPrice: number,
  quantity: number,
  bulkTiers: Array<{ minQuantity: number; discountPercentage: number }>,
): PriceCalculation {
  const applicableTier = bulkTiers
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];

  const discountPercentage = applicableTier?.discountPercentage || 0;
  const basePrice = unitPrice * quantity;

  return calculateDiscountedPrice(basePrice, discountPercentage);
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number,
  currency: string = "SAR",
  locale: string = "ar-SA",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compare prices and calculate percentage difference
 */
export function comparePrices(
  currentPrice: number,
  comparePrice: number,
): {
  difference: number;
  percentageDifference: number;
  isHigher: boolean;
  isLower: boolean;
} {
  const difference = currentPrice - comparePrice;
  const percentageDifference =
    comparePrice > 0 ? (difference / comparePrice) * 100 : 0;

  return {
    difference,
    percentageDifference,
    isHigher: difference > 0,
    isLower: difference < 0,
  };
}

/**
 * Calculate payment terms pricing (e.g., net 30, net 60)
 */
export function calculatePaymentTermsDiscount(
  amount: number,
  paymentTerms: "immediate" | "net30" | "net60" | "net90",
): PriceCalculation {
  const discountRates = {
    immediate: 2, // 2% discount for immediate payment
    net30: 1, // 1% discount for 30-day terms
    net60: 0, // No discount for 60-day terms
    net90: -1, // 1% penalty for 90-day terms
  };

  const discountPercentage = discountRates[paymentTerms];
  return calculateDiscountedPrice(amount, discountPercentage);
}

// Subscription pricing calculation
export interface SubscriptionQuote {
  items: Array<{
    module: string;
    seatCount: number;
    unitPriceMonthly: number;
    billingCategory: string;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  monthly: number;
  annualTotal: number;
  annualDiscountPct: number;
  currency: string;
  contactSales?: boolean;
}

interface QuoteItem {
  moduleCode?: string;
  module?: string;
  unitPriceMonthly?: number;
  seatCount?: number;
  billingCategory?: string;
}

export function computeQuote(params: {
  items: QuoteItem[];
  seatTotal: number;
  billingCycle: "monthly" | "annual";
  isUnlimited?: boolean; // For enterprise plans with unlimited seats
}): SubscriptionQuote {
  const { items, seatTotal, isUnlimited } = params;

  // For unlimited plans (Enterprise), use a fixed enterprise pricing model
  // instead of per-seat calculation
  if (isUnlimited) {
    return {
      items: items.map((item) => ({
        module: item.moduleCode || item.module || "UNKNOWN",
        seatCount: -1, // Unlimited
        unitPriceMonthly: 0, // Enterprise uses custom pricing
        billingCategory: item.billingCategory || "ENTERPRISE",
        total: 0,
      })),
      subtotal: 0,
      tax: 0,
      total: 0,
      monthly: 0,
      annualTotal: 0,
      annualDiscountPct: 0,
      currency: "SAR",
      contactSales: true, // Enterprise plans require sales contact
    };
  }

  // Process items with seat-based pricing
  const processedItems = items.map((item) => {
    const unitPriceMonthly = item.unitPriceMonthly || 50; // Default $50/seat/month
    const seatCount = item.seatCount || seatTotal;
    const total = seatCount * unitPriceMonthly;

    return {
      module: item.moduleCode || item.module || "UNKNOWN",
      seatCount,
      unitPriceMonthly,
      billingCategory: item.billingCategory || "CORE",
      total,
    };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + tax;
  const monthly = total;

  // Annual discount: 15% off
  const annualDiscountPct = 15;
  const annualTotal = monthly * 12 * (1 - annualDiscountPct / 100);

  return {
    items: processedItems,
    subtotal,
    tax,
    total,
    monthly,
    annualTotal,
    annualDiscountPct,
    currency: "SAR",
  };
}

const pricingUtils = {
  calculateDiscountedPrice,
  calculatePriceWithTax,
  getApplicableTier,
  calculateBulkPricing,
  formatPrice,
  comparePrices,
  calculatePaymentTermsDiscount,
  computeQuote,
};

export default pricingUtils;
