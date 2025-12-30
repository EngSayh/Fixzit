/**
 * @fileoverview Shared pricing plans configuration
 * @description Centralized plan definitions used by checkout and pricing pages
 * @module lib/plans
 */

export interface Plan {
  id: string;
  name: string;
  pricePerUser: number;
  description?: string;
  features?: string[];
  maxUsers?: number;
  cta?: string;
  isTrial?: boolean;
}

/**
 * Pricing plans with authoritative pricing (server-side)
 * SECURITY: Always use this server-side to calculate totals - never trust client-supplied amounts
 */
export const PLANS: Record<string, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    pricePerUser: 0,
    description: "Free trial for small teams",
    features: ["Work Orders", "Properties & Units", "Basic Reports", "Email support"],
    maxUsers: 3,
    cta: "Start Free Trial",
    isTrial: true,
  },
  standard: {
    id: "standard",
    name: "Standard",
    pricePerUser: 99,
    description: "Core FM, Work Orders, Properties",
    features: [
      "Work Orders",
      "Properties & Units",
      "Basic Reports",
      "Email support",
      "Up to 10 users",
    ],
    maxUsers: 10,
    cta: "Subscribe Now",
  },
  premium: {
    id: "premium",
    name: "Premium",
    pricePerUser: 199,
    description: "Finance + HR + Approvals + Analytics",
    features: [
      "All Standard features",
      "Finance & Invoicing",
      "HR & Technicians",
      "Approvals Workflow",
      "Priority support",
      "Up to 50 users",
    ],
    maxUsers: 50,
    cta: "Subscribe Now",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    pricePerUser: 299,
    description: "Full platform + SLA + Dedicated Support",
    features: [
      "All Premium features",
      "ZATCA Integration",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Unlimited users",
    ],
    cta: "Contact Sales",
  },
};

/**
 * Get plan by ID with safe fallback
 */
export function getPlan(planId: string): Plan {
  return PLANS[planId] || PLANS.standard;
}

/**
 * Calculate total price for a plan (server-side authoritative calculation)
 * @param planId - The plan identifier
 * @param users - Number of users/seats
 * @returns Object with subtotal, VAT (15%), and total in SAR
 */
export function calculatePlanPrice(planId: string, users: number): {
  subtotal: number;
  vat: number;
  total: number;
  plan: Plan;
} {
  const plan = getPlan(planId);
  
  // Normalize users input to a finite positive integer, fallback to 1
  let normalizedUsers = Number(users);
  if (!Number.isFinite(normalizedUsers) || normalizedUsers <= 0 || isNaN(normalizedUsers)) {
    normalizedUsers = 1;
  }
  normalizedUsers = Math.floor(normalizedUsers);
  
  // If plan.maxUsers is undefined, treat as unlimited (no cap)
  // Otherwise clamp to the defined maximum
  const validUsers = plan.maxUsers !== undefined
    ? Math.min(normalizedUsers, plan.maxUsers)
    : normalizedUsers;
  
  const subtotal = plan.pricePerUser * validUsers;
  const vat = subtotal * 0.15; // 15% VAT
  const total = subtotal + vat;
  
  return { subtotal, vat, total, plan };
}
