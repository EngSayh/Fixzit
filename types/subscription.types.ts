/**
 * Subscription & Monetization Types
 * @module types/subscription
 * @description Broker subscriptions, plans, and feature gating for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Subscription Core Types
// ============================================================================

export type PlanType = "individual" | "business" | "enterprise";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "suspended" | "trialing";

export interface ISubscriptionFeatures {
  max_listings: number;
  max_users: number;
  logo_branding: boolean;
  commission_exempt: boolean;
  visibility_boost: boolean;
  contact_marketing_requests: boolean;
  view_search_requests: boolean;
  premium_support: boolean;
  account_manager: boolean;
  analytics_advanced: boolean;
  api_access: boolean;
}

export interface ISubscription {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  user_id: ObjectId | string;
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  price: number; // In halalas
  currency: string;
  features: ISubscriptionFeatures;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  cancelled_at?: Date;
  trial_end?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ISubscriptionPlan {
  id: PlanType;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  price_monthly: number; // In SAR
  price_annual: number; // In SAR
  savings_percent: number;
  features: ISubscriptionFeatures;
  is_popular?: boolean;
  badge?: string;
  badge_ar?: string;
}

// ============================================================================
// API Request/Response DTOs
// ============================================================================

export interface GetPlansResponse {
  plans: ISubscriptionPlan[];
}

export interface CreateSubscriptionRequest {
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  payment_method_id?: string;
  use_wallet?: boolean;
}

export interface CreateSubscriptionResponse {
  subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  payment_required?: boolean;
  payment_url?: string;
}

export interface CurrentSubscriptionResponse {
  subscription: ISubscription | null;
  features: ISubscriptionFeatures | null;
  is_active: boolean;
  days_remaining?: number;
  usage: {
    listings_used: number;
    listings_limit: number;
    users_used: number;
    users_limit: number;
  };
}

export interface CancelSubscriptionRequest {
  cancel_at_period_end: boolean;
  reason?: string;
}

export interface CancelSubscriptionResponse {
  subscription_id: string;
  cancelled_at: Date;
  cancel_at_period_end: boolean;
  effective_date: Date;
}

export interface UpgradeSubscriptionRequest {
  new_plan_type: PlanType;
  new_billing_cycle?: BillingCycle;
}

export interface UpgradeSubscriptionResponse {
  subscription_id: string;
  proration_amount: number; // Credit/debit in halalas
  new_price: number;
  effective_immediately: boolean;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface SubscriptionCardProps {
  plan: ISubscriptionPlan;
  billingCycle: BillingCycle;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface SubscriptionPlansProps {
  plans: ISubscriptionPlan[];
  currentPlan?: PlanType;
  onSelectPlan: (plan: ISubscriptionPlan, cycle: BillingCycle) => void;
  isLoading?: boolean;
}

export interface SubscriptionBadgeProps {
  status: SubscriptionStatus;
  daysRemaining?: number;
  className?: string;
}

// ============================================================================
// Plan Configuration (Pricing Reference from Competitor Analysis)
// ============================================================================

export const SUBSCRIPTION_PLANS: ISubscriptionPlan[] = [
  {
    id: "individual",
    name: "Individual Plan",
    name_ar: "باقة الأفراد",
    description: "Perfect for individual brokers",
    description_ar: "مثالية للوسطاء الأفراد",
    price_monthly: 199,
    price_annual: 1799,
    savings_percent: 25,
    features: {
      max_listings: 50,
      max_users: 1,
      logo_branding: false,
      commission_exempt: true,
      visibility_boost: true,
      contact_marketing_requests: true,
      view_search_requests: true,
      premium_support: true,
      account_manager: false,
      analytics_advanced: false,
      api_access: false,
    },
    is_popular: true,
    badge: "Most Popular",
    badge_ar: "الأكثر شيوعاً",
  },
  {
    id: "business",
    name: "Business Plan",
    name_ar: "باقة المنشآت",
    description: "For real estate businesses and teams",
    description_ar: "للشركات العقارية والفرق",
    price_monthly: 599,
    price_annual: 5499,
    savings_percent: 24,
    features: {
      max_listings: 250,
      max_users: 5,
      logo_branding: true,
      commission_exempt: true,
      visibility_boost: true,
      contact_marketing_requests: true,
      view_search_requests: true,
      premium_support: true,
      account_manager: true,
      analytics_advanced: true,
      api_access: false,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    name_ar: "باقة الشركات",
    description: "Custom solutions for large organizations",
    description_ar: "حلول مخصصة للمؤسسات الكبيرة",
    price_monthly: 0, // Contact sales
    price_annual: 0,
    savings_percent: 0,
    features: {
      max_listings: -1, // Unlimited
      max_users: -1, // Unlimited
      logo_branding: true,
      commission_exempt: true,
      visibility_boost: true,
      contact_marketing_requests: true,
      view_search_requests: true,
      premium_support: true,
      account_manager: true,
      analytics_advanced: true,
      api_access: true,
    },
    badge: "Contact Sales",
    badge_ar: "تواصل معنا",
  },
];
