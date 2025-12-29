/**
 * AI Analytics Service
 * 
 * Implements AI-powered analytics capabilities:
 * - Anomaly Detection (z-score based standard score approach)
 * - Natural Language Query (text-to-SQL/aggregation)
 * - Churn Prediction (multi-factor scoring)
 * - Asset Health Scoring
 * - Predictive Maintenance (RUL estimation with degradation modeling)
 * 
 * @module services/ai/analytics-service
 */

import { logger } from "@/lib/logger";
import type { ObjectId } from "mongodb";

// =============================================================================
// TYPES
// =============================================================================

export interface AnomalyResult {
  /** Record ID that triggered anomaly */
  record_id: string;
  /** Anomaly score (0-1, higher = more anomalous) */
  score: number;
  /** Is this an anomaly based on threshold */
  is_anomaly: boolean;
  /** Features that contributed to anomaly */
  contributing_features: string[];
  /** Description of the anomaly */
  description: string;
  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";
  /** Recommended action */
  recommendation?: string;
  /** Detected at */
  detected_at: Date;
}

export interface NlQueryResult {
  /** Original natural language query */
  query: string;
  /** Generated aggregation pipeline or SQL */
  generated_query: object | string;
  /** Query type */
  query_type: "aggregation" | "sql" | "count" | "find";
  /** Results */
  results: unknown[];
  /** Total count */
  total_count: number;
  /** Execution time (ms) */
  execution_time_ms: number;
  /** Confidence in query interpretation (0-1) */
  confidence: number;
  /** Suggestions for better queries */
  suggestions?: string[];
}

export interface ChurnPrediction {
  /** Tenant ID */
  tenant_id: ObjectId;
  /** Churn probability (0-1) */
  probability: number;
  /** Risk category */
  risk: "low" | "medium" | "high" | "critical";
  /** Key risk factors */
  factors: ChurnFactor[];
  /** Recommended interventions */
  interventions: string[];
  /** Predicted churn date (if high risk) */
  predicted_churn_date?: Date;
  /** Model confidence */
  confidence: number;
  /** Prediction timestamp */
  predicted_at: Date;
}

export interface ChurnFactor {
  factor: string;
  impact: number; // -1 to 1 (negative = increases churn risk)
  value: number | string;
  benchmark: number | string;
  trend: "improving" | "stable" | "declining";
}

export interface AssetHealthScore {
  /** Asset ID */
  asset_id: ObjectId;
  /** Overall health score (0-100) */
  score: number;
  /** Health category */
  category: "excellent" | "good" | "fair" | "poor" | "critical";
  /** Component health breakdown */
  components: ComponentHealth[];
  /** Maintenance recommendation */
  maintenance_needed: boolean;
  /** Priority level */
  priority: "low" | "medium" | "high" | "urgent";
  /** Estimated remaining useful life (days) */
  estimated_rul_days?: number;
  /** Last updated */
  updated_at: Date;
}

export interface ComponentHealth {
  name: string;
  score: number;
  status: "healthy" | "degraded" | "failing";
  last_maintenance?: Date;
  next_maintenance?: Date;
}

export interface PredictiveMaintenanceResult {
  /** Asset ID */
  asset_id: ObjectId;
  /** Remaining Useful Life in days */
  rul_days: number;
  /** Confidence interval (lower, upper) */
  confidence_interval: [number, number];
  /** Failure probability in next 30 days */
  failure_probability_30d: number;
  /** Recommended maintenance date */
  recommended_maintenance_date: Date;
  /** Predicted failure mode */
  predicted_failure_mode?: string;
  /** Cost of preventive maintenance */
  preventive_cost?: number;
  /** Cost of reactive maintenance (after failure) */
  reactive_cost?: number;
  /** Model used */
  model_version: string;
  /** Prediction timestamp */
  predicted_at: Date;
}

// =============================================================================
// ANOMALY DETECTION (Isolation Forest-inspired)
// =============================================================================

interface AnomalyDetectionConfig {
  /** Number of isolation trees */
  n_trees?: number;
  /** Sample size for each tree */
  sample_size?: number;
  /** Contamination factor (expected % of anomalies) */
  contamination?: number;
  /** Threshold for anomaly score */
  threshold?: number;
}

const DEFAULT_ANOMALY_CONFIG: Required<AnomalyDetectionConfig> = {
  n_trees: 100,
  sample_size: 256,
  contamination: 0.1,
  threshold: 0.7,
};

/**
 * Detect anomalies in numerical data using simplified Isolation Forest
 */
export function detectAnomalies(
  data: Record<string, number>[],
  features: string[],
  config: AnomalyDetectionConfig = {}
): AnomalyResult[] {
  const cfg = { ...DEFAULT_ANOMALY_CONFIG, ...config };
  const results: AnomalyResult[] = [];
  
  if (data.length === 0 || features.length === 0) {
    return results;
  }
  
  // Calculate statistics for each feature
  const stats = calculateFeatureStats(data, features);
  
  // Calculate anomaly scores using z-score based approach
  // (simplified version of Isolation Forest)
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const featureScores: { feature: string; zscore: number }[] = [];
    
    for (const feature of features) {
      const value = record[feature];
      const { mean, std } = stats[feature];
      
      if (std > 0) {
        const zscore = Math.abs((value - mean) / std);
        featureScores.push({ feature, zscore });
      }
    }
    
    // Calculate overall anomaly score
    const maxZscore = Math.max(...featureScores.map(f => f.zscore), 0);
    const anomalyScore = Math.min(1, maxZscore / 4); // Normalize to 0-1
    
    if (anomalyScore >= cfg.threshold) {
      const contributingFeatures = featureScores
        .filter(f => f.zscore > 2)
        .sort((a, b) => b.zscore - a.zscore)
        .map(f => f.feature);
      
      results.push({
        record_id: String(i),
        score: anomalyScore,
        is_anomaly: true,
        contributing_features: contributingFeatures,
        description: generateAnomalyDescription(record, contributingFeatures, stats),
        severity: scoreToseverity(anomalyScore),
        detected_at: new Date(),
      });
    }
  }
  
  return results;
}

function calculateFeatureStats(
  data: Record<string, number>[],
  features: string[]
): Record<string, { mean: number; std: number; min: number; max: number }> {
  const stats: Record<string, { mean: number; std: number; min: number; max: number }> = {};
  
  for (const feature of features) {
    const values = data.map(d => d[feature]).filter(v => typeof v === "number" && !isNaN(v));
    
    if (values.length === 0) {
      stats[feature] = { mean: 0, std: 0, min: 0, max: 0 };
      continue;
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(variance);
    
    stats[feature] = {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  
  return stats;
}

function generateAnomalyDescription(
  record: Record<string, number>,
  contributingFeatures: string[],
  stats: Record<string, { mean: number; std: number; min: number; max: number }>
): string {
  if (contributingFeatures.length === 0) {
    return "Unusual pattern detected across multiple features";
  }
  
  const topFeature = contributingFeatures[0];
  const value = record[topFeature];
  const { mean } = stats[topFeature];
  const direction = value > mean ? "above" : "below";
  
  return `Unusual ${topFeature} value (${value.toFixed(2)}) - significantly ${direction} average (${mean.toFixed(2)})`;
}

function scoreToseverity(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 0.9) return "critical";
  if (score >= 0.8) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

// =============================================================================
// NATURAL LANGUAGE QUERY
// =============================================================================

interface NlQueryContext {
  /** Available collections */
  collections: string[];
  /** Collection schemas (field names and types) */
  schemas: Record<string, Record<string, string>>;
  /** Example values for fields */
  examples?: Record<string, Record<string, unknown[]>>;
}

const QUERY_PATTERNS: Array<{
  pattern: RegExp;
  template: (matches: string[]) => { type: string; pipeline: object[] };
}> = [
  // Count patterns
  {
    pattern: /how many (.*?)s?(?: are there)?(?: in (.*))?$/i,
    template: (_matches) => ({
      type: "count",
      pipeline: [
        { $match: {} },
        { $count: "total" },
      ],
    }),
  },
  // Top N patterns
  {
    pattern: /(?:top|best|highest) (\d+) (.*?) by (.*)/i,
    template: (matches) => ({
      type: "aggregation",
      pipeline: [
        { $sort: { [matches[3]]: -1 } },
        { $limit: parseInt(matches[1]) },
      ],
    }),
  },
  // Sum/total patterns
  {
    pattern: /(?:total|sum of) (.*?) (?:for|by|grouped by) (.*)/i,
    template: (matches) => ({
      type: "aggregation",
      pipeline: [
        {
          $group: {
            _id: `$${matches[2]}`,
            total: { $sum: `$${matches[1]}` },
          },
        },
        { $sort: { total: -1 } },
      ],
    }),
  },
  // Average patterns
  {
    pattern: /(?:average|avg|mean) (.*?) (?:for|by|grouped by) (.*)/i,
    template: (matches) => ({
      type: "aggregation",
      pipeline: [
        {
          $group: {
            _id: `$${matches[2]}`,
            average: { $avg: `$${matches[1]}` },
          },
        },
        { $sort: { average: -1 } },
      ],
    }),
  },
];

/**
 * Convert natural language query to MongoDB aggregation pipeline
 */
export function parseNaturalLanguageQuery(
  query: string,
  context: NlQueryContext
): { pipeline: object[]; confidence: number; suggestions: string[] } {
  const normalizedQuery = query.toLowerCase().trim();
  const suggestions: string[] = [];
  
  // Try to match against known patterns
  for (const { pattern, template } of QUERY_PATTERNS) {
    const matches = normalizedQuery.match(pattern);
    if (matches) {
      const result = template(matches);
      return {
        pipeline: result.pipeline,
        confidence: 0.8,
        suggestions,
      };
    }
  }
  
  // Fallback: try to extract field names from query
  const extractedFields = extractFieldsFromQuery(normalizedQuery, context);
  
  if (extractedFields.length > 0) {
    suggestions.push(`Try: "show me all records with ${extractedFields[0]}"`);
    suggestions.push(`Try: "count ${context.collections[0] ?? 'records'} grouped by ${extractedFields[0]}"`);
    
    return {
      pipeline: [
        { $project: Object.fromEntries(extractedFields.map(f => [f, 1])) },
        { $limit: 100 },
      ],
      confidence: 0.5,
      suggestions,
    };
  }
  
  // Unable to parse
  suggestions.push("Try: 'how many work orders are there'");
  suggestions.push("Try: 'top 10 tenants by revenue'");
  suggestions.push("Try: 'average response time by category'");
  
  return {
    pipeline: [{ $limit: 10 }],
    confidence: 0.2,
    suggestions,
  };
}

function extractFieldsFromQuery(
  query: string,
  context: NlQueryContext
): string[] {
  const fields: string[] = [];
  
  for (const [, schema] of Object.entries(context.schemas)) {
    for (const fieldName of Object.keys(schema)) {
      if (query.includes(fieldName.toLowerCase())) {
        fields.push(fieldName);
      }
    }
  }
  
  return fields;
}

/**
 * Execute natural language query (wrapper for actual DB execution)
 */
export async function executeNlQuery(
  query: string,
  context: NlQueryContext,
  _db: unknown
): Promise<NlQueryResult> {
  const startTime = Date.now();
  
  const { pipeline, confidence, suggestions } = parseNaturalLanguageQuery(query, context);
  
  // In production, execute against actual database
  // const results = await db.collection(collection).aggregate(pipeline).toArray();
  
  const executionTime = Date.now() - startTime;
  
  logger.info("NL query executed", {
    query,
    confidence,
    executionTime,
  });
  
  return {
    query,
    generated_query: pipeline,
    query_type: "aggregation",
    results: [], // Would be populated from DB
    total_count: 0,
    execution_time_ms: executionTime,
    confidence,
    suggestions,
  };
}

// =============================================================================
// CHURN PREDICTION
// =============================================================================

interface TenantMetrics {
  tenant_id: ObjectId;
  days_since_signup: number;
  days_since_last_activity: number;
  active_users_ratio: number; // active users / total users
  feature_adoption_rate: number; // 0-1
  support_tickets_30d: number;
  nps_score?: number;
  payment_failures_90d: number;
  login_frequency_trend: number; // positive = increasing, negative = decreasing
  work_orders_trend: number;
  api_usage_trend: number;
}

const _CHURN_WEIGHTS: Record<keyof Omit<TenantMetrics, "tenant_id">, number> = {
  days_since_signup: -0.05, // Newer = higher risk (negative impact on retention)
  days_since_last_activity: 0.15, // More days = higher risk
  active_users_ratio: -0.20, // Higher ratio = lower risk
  feature_adoption_rate: -0.15, // Higher adoption = lower risk
  support_tickets_30d: 0.10, // More tickets could indicate frustration
  nps_score: -0.10, // Higher NPS = lower risk
  payment_failures_90d: 0.15, // Payment issues = higher risk
  login_frequency_trend: -0.10, // Increasing logins = lower risk
  work_orders_trend: -0.10, // Increasing usage = lower risk
  api_usage_trend: -0.05, // Increasing API usage = lower risk (integration)
};

/**
 * Predict churn probability for a tenant
 */
export function predictChurn(metrics: TenantMetrics): ChurnPrediction {
  const factors: ChurnFactor[] = [];
  let riskScore = 0.5; // Base risk
  
  // Days since last activity
  if (metrics.days_since_last_activity > 14) {
    const impact = Math.min(0.3, metrics.days_since_last_activity * 0.01);
    riskScore += impact;
    factors.push({
      factor: "Inactivity",
      impact: -impact,
      value: metrics.days_since_last_activity,
      benchmark: 7,
      trend: metrics.days_since_last_activity > 30 ? "declining" : "stable",
    });
  }
  
  // Active users ratio
  if (metrics.active_users_ratio < 0.3) {
    const impact = (0.3 - metrics.active_users_ratio) * 0.5;
    riskScore += impact;
    factors.push({
      factor: "Low user engagement",
      impact: -impact,
      value: `${(metrics.active_users_ratio * 100).toFixed(0)}%`,
      benchmark: "50%",
      trend: "declining",
    });
  }
  
  // Feature adoption
  if (metrics.feature_adoption_rate < 0.2) {
    const impact = (0.2 - metrics.feature_adoption_rate) * 0.3;
    riskScore += impact;
    factors.push({
      factor: "Low feature adoption",
      impact: -impact,
      value: `${(metrics.feature_adoption_rate * 100).toFixed(0)}%`,
      benchmark: "40%",
      trend: "stable",
    });
  }
  
  // Payment failures
  if (metrics.payment_failures_90d > 0) {
    const impact = Math.min(0.2, metrics.payment_failures_90d * 0.05);
    riskScore += impact;
    factors.push({
      factor: "Payment issues",
      impact: -impact,
      value: metrics.payment_failures_90d,
      benchmark: 0,
      trend: "declining",
    });
  }
  
  // NPS score
  if (metrics.nps_score !== undefined && metrics.nps_score < 7) {
    const impact = (7 - metrics.nps_score) * 0.03;
    riskScore += impact;
    factors.push({
      factor: "Low satisfaction",
      impact: -impact,
      value: metrics.nps_score,
      benchmark: 8,
      trend: "declining",
    });
  }
  
  // Usage trends
  if (metrics.login_frequency_trend < 0) {
    const impact = Math.abs(metrics.login_frequency_trend) * 0.1;
    riskScore += impact;
    factors.push({
      factor: "Declining login frequency",
      impact: -impact,
      value: `${(metrics.login_frequency_trend * 100).toFixed(0)}%`,
      benchmark: "0%",
      trend: "declining",
    });
  }
  
  // Normalize score to 0-1
  const probability = Math.max(0, Math.min(1, riskScore));
  
  // Determine risk category
  let risk: ChurnPrediction["risk"];
  if (probability >= 0.8) risk = "critical";
  else if (probability >= 0.6) risk = "high";
  else if (probability >= 0.4) risk = "medium";
  else risk = "low";
  
  // Generate interventions based on factors
  const interventions = generateInterventions(factors);
  
  // Calculate predicted churn date for high-risk tenants
  let predictedChurnDate: Date | undefined;
  if (probability >= 0.6) {
    const daysToChurn = Math.round((1 - probability) * 90);
    predictedChurnDate = new Date();
    predictedChurnDate.setDate(predictedChurnDate.getDate() + daysToChurn);
  }
  
  return {
    tenant_id: metrics.tenant_id,
    probability,
    risk,
    factors: factors.sort((a, b) => a.impact - b.impact), // Most impactful first
    interventions,
    predicted_churn_date: predictedChurnDate,
    confidence: Math.min(1.0, 0.75 + (factors.length * 0.02)), // More factors = more confident, clamped to 1.0
    predicted_at: new Date(),
  };
}

function generateInterventions(factors: ChurnFactor[]): string[] {
  const interventions: string[] = [];
  
  for (const factor of factors) {
    switch (factor.factor) {
      case "Inactivity":
        interventions.push("Send re-engagement email with product updates");
        interventions.push("Schedule customer success call");
        break;
      case "Low user engagement":
        interventions.push("Offer training session for team");
        interventions.push("Share best practices guide");
        break;
      case "Low feature adoption":
        interventions.push("Provide personalized onboarding for unused features");
        interventions.push("Share success stories from similar customers");
        break;
      case "Payment issues":
        interventions.push("Reach out to resolve billing concerns");
        interventions.push("Consider offering flexible payment options");
        break;
      case "Low satisfaction":
        interventions.push("Schedule feedback call with leadership");
        interventions.push("Offer service credits or dedicated support");
        break;
      case "Declining login frequency":
        interventions.push("Send weekly digest of platform activity");
        interventions.push("Highlight new features and improvements");
        break;
    }
  }
  
  return [...new Set(interventions)].slice(0, 5); // Unique, max 5
}

// =============================================================================
// ASSET HEALTH SCORING
// =============================================================================

interface AssetMetrics {
  asset_id: ObjectId;
  age_days: number;
  expected_lifespan_days: number;
  work_orders_count: number;
  avg_repair_cost: number;
  time_since_last_maintenance_days: number;
  maintenance_schedule_compliance: number; // 0-1
  sensor_readings?: {
    temperature?: number;
    vibration?: number;
    power_consumption?: number;
  };
  failure_history: number; // count of failures
}

/**
 * Calculate asset health score
 */
export function calculateAssetHealth(metrics: AssetMetrics): AssetHealthScore {
  let score = 100;
  const components: ComponentHealth[] = [];
  
  // Age factor (max 30 point deduction)
  const ageRatio = metrics.age_days / metrics.expected_lifespan_days;
  const ageDeduction = Math.min(30, ageRatio * 30);
  score -= ageDeduction;
  
  components.push({
    name: "Age/Lifecycle",
    score: Math.max(0, 100 - ageDeduction * 3),
    status: ageRatio > 0.8 ? "degraded" : ageRatio > 1 ? "failing" : "healthy",
  });
  
  // Maintenance compliance (max 25 point deduction)
  const maintenanceDeduction = (1 - metrics.maintenance_schedule_compliance) * 25;
  score -= maintenanceDeduction;
  
  components.push({
    name: "Maintenance",
    score: Math.max(0, 100 - maintenanceDeduction * 4),
    status: metrics.maintenance_schedule_compliance < 0.5 ? "failing" : 
            metrics.maintenance_schedule_compliance < 0.8 ? "degraded" : "healthy",
  });
  
  // Work orders frequency (max 20 point deduction)
  // Higher than expected work orders indicate problems
  const expectedWoPerYear = 4; // baseline
  const actualWoPerYear = metrics.age_days > 0 
    ? (metrics.work_orders_count / metrics.age_days) * 365 
    : 0;
  const woRatio = expectedWoPerYear > 0 ? actualWoPerYear / expectedWoPerYear : 0;
  const woDeduction = Math.min(20, (woRatio - 1) * 10);
  if (woDeduction > 0) {
    score -= woDeduction;
  }
  
  components.push({
    name: "Reliability",
    score: Math.max(0, 100 - Math.max(0, woDeduction) * 5),
    status: woRatio > 2 ? "failing" : woRatio > 1.5 ? "degraded" : "healthy",
  });
  
  // Failure history (max 15 point deduction)
  const failureDeduction = Math.min(15, metrics.failure_history * 3);
  score -= failureDeduction;
  
  components.push({
    name: "Failure History",
    score: Math.max(0, 100 - failureDeduction * 6),
    status: metrics.failure_history > 3 ? "failing" : 
            metrics.failure_history > 1 ? "degraded" : "healthy",
  });
  
  // Sensor readings if available (max 10 point deduction)
  if (metrics.sensor_readings) {
    let sensorDeduction = 0;
    
    // Temperature anomaly
    if (metrics.sensor_readings.temperature && metrics.sensor_readings.temperature > 80) {
      sensorDeduction += 5;
    }
    
    // High vibration
    if (metrics.sensor_readings.vibration && metrics.sensor_readings.vibration > 0.5) {
      sensorDeduction += 5;
    }
    
    score -= Math.min(10, sensorDeduction);
    
    components.push({
      name: "Sensor Status",
      score: Math.max(0, 100 - sensorDeduction * 10),
      status: sensorDeduction > 5 ? "failing" : sensorDeduction > 0 ? "degraded" : "healthy",
    });
  }
  
  // Normalize score
  score = Math.max(0, Math.min(100, score));
  
  // Determine category
  let category: AssetHealthScore["category"];
  if (score >= 90) category = "excellent";
  else if (score >= 75) category = "good";
  else if (score >= 50) category = "fair";
  else if (score >= 25) category = "poor";
  else category = "critical";
  
  // Determine priority
  let priority: AssetHealthScore["priority"];
  if (score < 25) priority = "urgent";
  else if (score < 50) priority = "high";
  else if (score < 75) priority = "medium";
  else priority = "low";
  
  // Estimate RUL
  const remainingLifespanDays = Math.max(0, metrics.expected_lifespan_days - metrics.age_days);
  const healthAdjustedRul = Math.round(remainingLifespanDays * (score / 100));
  
  return {
    asset_id: metrics.asset_id,
    score: Math.round(score),
    category,
    components,
    maintenance_needed: score < 70 || metrics.time_since_last_maintenance_days > 90,
    priority,
    estimated_rul_days: healthAdjustedRul,
    updated_at: new Date(),
  };
}

// =============================================================================
// PREDICTIVE MAINTENANCE
// =============================================================================

/**
 * Predict remaining useful life and maintenance needs
 */
export function predictMaintenance(
  assetMetrics: AssetMetrics,
  historicalData: Array<{ date: Date; score: number }>
): PredictiveMaintenanceResult {
  // Calculate degradation rate from historical data
  let degradationRatePerDay = 0;
  
  if (historicalData.length >= 2) {
    const sorted = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstPoint = sorted[0];
    const lastPoint = sorted[sorted.length - 1];
    
    const daysDiff = (lastPoint.date.getTime() - firstPoint.date.getTime()) / (1000 * 60 * 60 * 24);
    const scoreDiff = firstPoint.score - lastPoint.score;
    
    if (daysDiff > 0) {
      degradationRatePerDay = scoreDiff / daysDiff;
    }
  }
  
  // Default degradation if no historical data
  if (degradationRatePerDay <= 0) {
    degradationRatePerDay = 0.1; // 0.1% per day default
  }
  
  // Current health score
  const currentHealth = calculateAssetHealth(assetMetrics);
  
  // Calculate RUL (days until score reaches critical threshold of 25)
  const criticalThreshold = 25;
  const daysToThreshold = Math.max(0, (currentHealth.score - criticalThreshold) / degradationRatePerDay);
  
  // Confidence interval based on data quality
  const confidenceMargin = historicalData.length < 5 ? 0.3 : 0.15;
  const lowerBound = Math.round(daysToThreshold * (1 - confidenceMargin));
  const upperBound = Math.round(daysToThreshold * (1 + confidenceMargin));
  
  // Failure probability in next 30 days
  // Ensure denominator is at least 1 to avoid division issues
  const effectiveDenominator = Math.max(1, currentHealth.score - criticalThreshold + 1);
  const failureProbability30d = Math.min(1, Math.max(0, 
    (30 * degradationRatePerDay) / effectiveDenominator
  ));
  
  // Recommended maintenance date (aim for 20% buffer before threshold)
  const bufferDays = Math.round(daysToThreshold * 0.2);
  const recommendedDate = new Date();
  recommendedDate.setDate(recommendedDate.getDate() + Math.max(7, daysToThreshold - bufferDays));
  
  // Cost estimates (simplified)
  const preventiveCost = assetMetrics.avg_repair_cost * 0.5;
  const reactiveCost = assetMetrics.avg_repair_cost * 2.5; // Reactive is typically 2-5x more expensive
  
  return {
    asset_id: assetMetrics.asset_id,
    rul_days: Math.round(daysToThreshold),
    confidence_interval: [lowerBound, upperBound],
    failure_probability_30d: Math.round(failureProbability30d * 100) / 100,
    recommended_maintenance_date: recommendedDate,
    predicted_failure_mode: currentHealth.components
      .filter(c => c.status !== "healthy")
      .map(c => c.name)
      .join(", ") || undefined,
    preventive_cost: Math.round(preventiveCost),
    reactive_cost: Math.round(reactiveCost),
    model_version: "v1.0.0-simplified",
    predicted_at: new Date(),
  };
}
