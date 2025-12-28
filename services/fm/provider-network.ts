/**
 * Provider Network Service
 * 
 * Manages the marketplace of service providers for FM operations:
 * - Provider onboarding and verification
 * - Skill/capability matching
 * - Automatic bid routing
 * - Performance scoring and ranking
 * - Contract management
 * - SLA monitoring
 * 
 * @module services/fm/provider-network
 */

import { logger } from "@/lib/logger";
import type { ObjectId } from "mongodb";

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceProvider {
  _id: ObjectId;
  org_id: ObjectId;
  
  // Basic Info
  company_name: string;
  company_name_ar: string;
  commercial_registration: string;
  vat_number: string;
  
  // Status
  status: ProviderStatus;
  verification_status: VerificationStatus;
  onboarded_at?: Date;
  
  // Capabilities
  capabilities: ProviderCapability[];
  service_areas: ServiceArea[];
  
  // Certifications
  certifications: ProviderCertification[];
  
  // Performance
  performance_score: number; // 0-100
  total_jobs_completed: number;
  average_rating: number; // 1-5
  on_time_rate: number; // 0-1
  first_time_fix_rate: number; // 0-1
  
  // Financials
  payment_terms: PaymentTerms;
  hourly_rate_range: { min: number; max: number };
  
  // Insurance
  insurance: InsuranceInfo;
  
  // Contacts
  primary_contact: ProviderContact;
  emergency_contact?: ProviderContact;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

export type ProviderStatus = 
  | "pending"
  | "active"
  | "suspended"
  | "terminated"
  | "blacklisted";

export type VerificationStatus =
  | "not_started"
  | "documents_pending"
  | "under_review"
  | "verified"
  | "rejected";

export interface ProviderCapability {
  category: ServiceCategory;
  subcategories: string[];
  skill_level: "basic" | "intermediate" | "advanced" | "expert";
  certifications?: string[];
  years_experience: number;
}

export type ServiceCategory =
  | "hvac"
  | "electrical"
  | "plumbing"
  | "mechanical"
  | "fire_safety"
  | "elevator"
  | "cleaning"
  | "landscaping"
  | "security"
  | "pest_control"
  | "roofing"
  | "painting"
  | "carpentry"
  | "general_maintenance";

export interface ServiceArea {
  city: string;
  districts: string[];
  max_travel_distance_km: number;
  response_time_hours: number;
}

export interface ProviderCertification {
  name: string;
  issuing_authority: string;
  issue_date: Date;
  expiry_date?: Date;
  verification_url?: string;
  verified: boolean;
}

export interface PaymentTerms {
  type: "immediate" | "net_15" | "net_30" | "net_60";
  preferred_method: "bank_transfer" | "sadad" | "credit_card";
  bank_details?: {
    bank_name: string;
    iban: string;
    account_name: string;
  };
}

export interface InsuranceInfo {
  provider: string;
  policy_number: string;
  coverage_amount: number;
  expiry_date: Date;
  verified: boolean;
}

export interface ProviderContact {
  name: string;
  phone: string;
  email: string;
  role: string;
}

// =============================================================================
// BID & MATCHING
// =============================================================================

export interface WorkOrderBid {
  _id: ObjectId;
  work_order_id: ObjectId;
  provider_id: ObjectId;
  org_id: ObjectId;
  
  // Bid details
  status: BidStatus;
  amount: number;
  currency: "SAR";
  
  // Timeline
  estimated_duration_hours: number;
  proposed_start_date: Date;
  proposed_completion_date: Date;
  
  // Materials
  materials_included: boolean;
  material_cost_estimate?: number;
  
  // Notes
  notes?: string;
  terms_and_conditions?: string;
  
  // Scoring
  match_score: number; // 0-100, calculated by matching algorithm
  
  // Metadata
  submitted_at: Date;
  expires_at: Date;
  responded_at?: Date;
}

export type BidStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface MatchCriteria {
  category: ServiceCategory;
  subcategory?: string;
  location: {
    city: string;
    district: string;
    coordinates?: { lat: number; lng: number };
  };
  urgency: "low" | "medium" | "high" | "emergency";
  estimated_budget?: { min: number; max: number };
  required_certifications?: string[];
  preferred_start_date?: Date;
  required_insurance_coverage?: number;
}

export interface MatchResult {
  provider: ServiceProvider;
  score: number; // 0-100
  breakdown: {
    capability_match: number;
    location_match: number;
    availability_match: number;
    performance_score: number;
    price_competitiveness: number;
  };
  estimated_response_time_hours: number;
  estimated_cost: { min: number; max: number };
  recommendation: "highly_recommended" | "recommended" | "acceptable" | "not_recommended";
}

// =============================================================================
// MATCHING ALGORITHM
// =============================================================================

const MATCH_WEIGHTS = {
  capability_match: 0.30,
  location_match: 0.20,
  availability_match: 0.15,
  performance_score: 0.25,
  price_competitiveness: 0.10,
};

/**
 * Find matching providers for work order requirements
 */
export function matchProviders(
  criteria: MatchCriteria,
  providers: ServiceProvider[],
  limit: number = 10
): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (const provider of providers) {
    // Skip non-active providers
    if (provider.status !== "active" || provider.verification_status !== "verified") {
      continue;
    }
    
    const breakdown = {
      capability_match: calculateCapabilityMatch(criteria, provider),
      location_match: calculateLocationMatch(criteria, provider),
      availability_match: calculateAvailabilityMatch(criteria, provider),
      performance_score: provider.performance_score,
      price_competitiveness: calculatePriceCompetitiveness(criteria, provider),
    };
    
    // Calculate weighted score
    const score = 
      breakdown.capability_match * MATCH_WEIGHTS.capability_match +
      breakdown.location_match * MATCH_WEIGHTS.location_match +
      breakdown.availability_match * MATCH_WEIGHTS.availability_match +
      breakdown.performance_score * MATCH_WEIGHTS.performance_score +
      breakdown.price_competitiveness * MATCH_WEIGHTS.price_competitiveness;
    
    // Determine recommendation
    let recommendation: MatchResult["recommendation"];
    if (score >= 85) recommendation = "highly_recommended";
    else if (score >= 70) recommendation = "recommended";
    else if (score >= 50) recommendation = "acceptable";
    else recommendation = "not_recommended";
    
    // Estimate response time based on urgency and service area
    const serviceArea = provider.service_areas.find(
      sa => sa.city.toLowerCase() === criteria.location.city.toLowerCase()
    );
    const baseResponseTime = serviceArea?.response_time_hours ?? 24;
    const urgencyMultiplier = {
      emergency: 0.25,
      high: 0.5,
      medium: 1,
      low: 1.5,
    };
    const estimatedResponseTime = baseResponseTime * urgencyMultiplier[criteria.urgency];
    
    results.push({
      provider,
      score: Math.round(score),
      breakdown,
      estimated_response_time_hours: Math.round(estimatedResponseTime),
      estimated_cost: {
        min: provider.hourly_rate_range.min * 2, // Assume 2 hour minimum
        max: provider.hourly_rate_range.max * 8, // Assume 8 hour job
      },
      recommendation,
    });
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

function calculateCapabilityMatch(criteria: MatchCriteria, provider: ServiceProvider): number {
  const capability = provider.capabilities.find(c => c.category === criteria.category);
  
  if (!capability) return 0;
  
  let score = 50; // Base score for category match
  
  // Subcategory match
  if (criteria.subcategory && capability.subcategories.includes(criteria.subcategory)) {
    score += 20;
  }
  
  // Skill level bonus
  const skillBonus = {
    basic: 0,
    intermediate: 5,
    advanced: 15,
    expert: 30,
  };
  score += skillBonus[capability.skill_level];
  
  // Certification requirements
  if (criteria.required_certifications) {
    const certNames = provider.certifications.map(c => c.name.toLowerCase());
    const matchedCerts = criteria.required_certifications.filter(
      req => certNames.some(cert => cert.includes(req.toLowerCase()))
    );
    if (matchedCerts.length === criteria.required_certifications.length) {
      score += 20;
    } else if (matchedCerts.length > 0) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

function calculateLocationMatch(criteria: MatchCriteria, provider: ServiceProvider): number {
  const serviceArea = provider.service_areas.find(
    sa => sa.city.toLowerCase() === criteria.location.city.toLowerCase()
  );
  
  if (!serviceArea) return 0;
  
  let score = 50; // Base score for city match
  
  // District match
  if (serviceArea.districts.includes(criteria.location.district)) {
    score += 30;
  } else if (serviceArea.districts.includes("*") || serviceArea.districts.length === 0) {
    score += 15; // Covers entire city
  }
  
  // Response time bonus
  if (serviceArea.response_time_hours <= 2) {
    score += 20;
  } else if (serviceArea.response_time_hours <= 4) {
    score += 10;
  }
  
  return Math.min(100, score);
}

function calculateAvailabilityMatch(criteria: MatchCriteria, provider: ServiceProvider): number {
  // In production, this would check provider calendar/schedule
  // For now, use a simplified scoring based on urgency handling capability
  
  let score = 70; // Assume generally available
  
  // Reduce score for emergency if provider is not 24/7
  if (criteria.urgency === "emergency") {
    // Check if any service area has < 2 hour response
    const hasEmergencyCapability = provider.service_areas.some(
      sa => sa.response_time_hours <= 2
    );
    if (!hasEmergencyCapability) {
      score -= 40;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculatePriceCompetitiveness(criteria: MatchCriteria, provider: ServiceProvider): number {
  if (!criteria.estimated_budget) {
    return 70; // Default score when no budget specified
  }
  
  const avgProviderRate = (provider.hourly_rate_range.min + provider.hourly_rate_range.max) / 2;
  const budgetMidpoint = (criteria.estimated_budget.min + criteria.estimated_budget.max) / 2;
  
  // Assume 4 hour job for comparison
  const estimatedCost = avgProviderRate * 4;
  
  if (estimatedCost <= budgetMidpoint) {
    // Within budget - higher score
    const ratio = estimatedCost / budgetMidpoint;
    return Math.round(100 - (ratio * 30)); // 70-100 range
  } else {
    // Over budget - lower score
    const overageRatio = estimatedCost / budgetMidpoint;
    return Math.max(0, Math.round(100 - (overageRatio * 50)));
  }
}

// =============================================================================
// PROVIDER LIFECYCLE
// =============================================================================

/**
 * Calculate provider performance score based on historical data
 */
export function calculatePerformanceScore(metrics: {
  total_jobs: number;
  on_time_completions: number;
  first_time_fixes: number;
  average_rating: number;
  customer_complaints: number;
  sla_violations: number;
}): number {
  if (metrics.total_jobs === 0) return 50; // Default for new providers
  
  const weights = {
    on_time_rate: 0.25,
    first_time_fix_rate: 0.25,
    rating: 0.30,
    complaint_rate: 0.10,
    sla_compliance: 0.10,
  };
  
  const onTimeRate = metrics.on_time_completions / metrics.total_jobs;
  const ftfRate = metrics.first_time_fixes / metrics.total_jobs;
  const ratingScore = (metrics.average_rating / 5) * 100;
  const complaintScore = Math.max(0, 100 - (metrics.customer_complaints / metrics.total_jobs * 500));
  const slaScore = Math.max(0, 100 - (metrics.sla_violations / metrics.total_jobs * 200));
  
  const score = 
    onTimeRate * 100 * weights.on_time_rate +
    ftfRate * 100 * weights.first_time_fix_rate +
    ratingScore * weights.rating +
    complaintScore * weights.complaint_rate +
    slaScore * weights.sla_compliance;
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Automatic bid routing based on work order requirements
 */
export async function routeBidsAutomatically(
  workOrderId: ObjectId,
  criteria: MatchCriteria,
  providers: ServiceProvider[],
  options: {
    max_providers?: number;
    auto_accept_threshold?: number;
    bid_deadline_hours?: number;
  } = {}
): Promise<{
  invited_providers: ObjectId[];
  auto_accepted?: ObjectId;
  bid_deadline: Date;
}> {
  const {
    max_providers = 5,
    auto_accept_threshold = 95,
    bid_deadline_hours = 24,
  } = options;
  
  const matches = matchProviders(criteria, providers, max_providers);
  
  const invitedProviders: ObjectId[] = [];
  let autoAccepted: ObjectId | undefined;
  
  for (const match of matches) {
    if (match.recommendation === "not_recommended") continue;
    
    invitedProviders.push(match.provider._id);
    
    // Auto-accept if score exceeds threshold and this is an emergency
    if (
      match.score >= auto_accept_threshold &&
      criteria.urgency === "emergency" &&
      !autoAccepted
    ) {
      autoAccepted = match.provider._id;
      logger.info("Auto-accepted provider for emergency work order", {
        work_order_id: workOrderId.toString(),
        provider_id: match.provider._id.toString(),
        score: match.score,
      });
    }
  }
  
  const bidDeadline = new Date();
  bidDeadline.setHours(bidDeadline.getHours() + bid_deadline_hours);
  
  return {
    invited_providers: invitedProviders,
    auto_accepted: autoAccepted,
    bid_deadline: bidDeadline,
  };
}

// =============================================================================
// SLA MONITORING
// =============================================================================

export interface SlaMetric {
  provider_id: ObjectId;
  metric: string;
  target: number;
  actual: number;
  period_start: Date;
  period_end: Date;
  status: "met" | "at_risk" | "breached";
  breach_count: number;
}

/**
 * Calculate SLA compliance for a provider
 */
export function calculateSlaCompliance(
  providerId: ObjectId,
  jobHistory: Array<{
    response_time_hours: number;
    resolution_time_hours: number;
    target_response_hours: number;
    target_resolution_hours: number;
    customer_rating: number;
  }>,
  periodStart: Date,
  periodEnd: Date
): SlaMetric[] {
  const metrics: SlaMetric[] = [];
  
  if (jobHistory.length === 0) {
    return metrics;
  }
  
  // Response Time SLA
  const responseCompliant = jobHistory.filter(
    j => j.response_time_hours <= j.target_response_hours
  ).length;
  const responseRate = (responseCompliant / jobHistory.length) * 100;
  
  metrics.push({
    provider_id: providerId,
    metric: "Response Time Compliance",
    target: 95,
    actual: Math.round(responseRate),
    period_start: periodStart,
    period_end: periodEnd,
    status: responseRate >= 95 ? "met" : responseRate >= 85 ? "at_risk" : "breached",
    breach_count: jobHistory.length - responseCompliant,
  });
  
  // Resolution Time SLA
  const resolutionCompliant = jobHistory.filter(
    j => j.resolution_time_hours <= j.target_resolution_hours
  ).length;
  const resolutionRate = (resolutionCompliant / jobHistory.length) * 100;
  
  metrics.push({
    provider_id: providerId,
    metric: "Resolution Time Compliance",
    target: 90,
    actual: Math.round(resolutionRate),
    period_start: periodStart,
    period_end: periodEnd,
    status: resolutionRate >= 90 ? "met" : resolutionRate >= 80 ? "at_risk" : "breached",
    breach_count: jobHistory.length - resolutionCompliant,
  });
  
  // Customer Satisfaction SLA
  const avgRating = jobHistory.reduce((sum, j) => sum + j.customer_rating, 0) / jobHistory.length;
  
  metrics.push({
    provider_id: providerId,
    metric: "Customer Satisfaction",
    target: 4.0,
    actual: Math.round(avgRating * 10) / 10,
    period_start: periodStart,
    period_end: periodEnd,
    status: avgRating >= 4.0 ? "met" : avgRating >= 3.5 ? "at_risk" : "breached",
    breach_count: jobHistory.filter(j => j.customer_rating < 3).length,
  });
  
  return metrics;
}
