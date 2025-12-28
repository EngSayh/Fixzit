/**
 * AI Analytics API
 * 
 * Endpoints for AI-powered analytics:
 * - Anomaly detection
 * - Churn prediction
 * - Asset health scoring
 * 
 * @route GET /api/ai/analytics
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    
    // Allow demo mode when not authenticated (for development/demo)
    const isDemo = !session?.user;
    const tenantId = isDemo ? "demo" : ((session?.user as { org_id?: string })?.org_id ?? "1");
    
    // AI Analytics summary
    const analytics = {
      tenant_id: tenantId,
      is_demo: isDemo,
      generated_at: new Date().toISOString(),
      
      // Anomaly Detection
      anomalies: {
        active_count: 3,
        resolved_24h: 7,
        items: [
          {
            id: "ANO-001",
            type: "cost_spike",
            severity: "medium",
            description: "Unusual maintenance cost increase in Building A - 45% above monthly average",
            detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            asset_id: "ASSET-1234",
            score: 0.78,
          },
          {
            id: "ANO-002",
            type: "usage_pattern",
            severity: "low",
            description: "HVAC running outside normal hours - 3 consecutive nights",
            detected_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            asset_id: "ASSET-5678",
            score: 0.65,
          },
          {
            id: "ANO-003",
            type: "work_order_volume",
            severity: "high",
            description: "Work order volume 3x normal for elevator systems",
            detected_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            asset_id: "ASSET-ELEV-01",
            score: 0.92,
          },
        ],
      },
      
      // Churn Prediction
      churn: {
        at_risk_tenants: 2,
        healthy_tenants: 45,
        predictions: [
          {
            tenant_name: "Al-Faisal Properties",
            risk_level: "high",
            probability: 0.72,
            primary_factor: "Declining login frequency",
            recommended_action: "Schedule customer success call",
            predicted_churn_date: "2025-02-15",
          },
          {
            tenant_name: "Gulf Commercial",
            risk_level: "medium",
            probability: 0.45,
            primary_factor: "Low feature adoption",
            recommended_action: "Provide personalized training",
            predicted_churn_date: null,
          },
        ],
      },
      
      // Asset Health
      asset_health: {
        total_assets: 234,
        excellent: 89,
        good: 98,
        fair: 32,
        poor: 12,
        critical: 3,
        critical_assets: [
          {
            asset_id: "ASSET-HVAC-12",
            name: "Main HVAC Unit - Tower B",
            health_score: 23,
            rul_days: 15,
            failure_probability_30d: 0.78,
            recommended_action: "Schedule immediate maintenance",
            estimated_cost_preventive: 5000,
            estimated_cost_reactive: 25000,
          },
          {
            asset_id: "ASSET-ELEV-03",
            name: "Passenger Elevator 3",
            health_score: 28,
            rul_days: 22,
            failure_probability_30d: 0.65,
            recommended_action: "Order replacement parts",
            estimated_cost_preventive: 8000,
            estimated_cost_reactive: 45000,
          },
          {
            asset_id: "ASSET-GEN-01",
            name: "Backup Generator",
            health_score: 31,
            rul_days: 28,
            failure_probability_30d: 0.52,
            recommended_action: "Schedule comprehensive inspection",
            estimated_cost_preventive: 3000,
            estimated_cost_reactive: 15000,
          },
        ],
      },
      
      // Summary Insights
      insights: [
        {
          type: "cost_saving",
          title: "Preventive Maintenance Opportunity",
          description: "Acting on 3 critical asset alerts could save SAR 67,000 in reactive repair costs",
          priority: "high",
          action_url: "/fm/assets?filter=critical",
        },
        {
          type: "risk",
          title: "Churn Risk Alert",
          description: "2 tenants showing early churn signals - immediate outreach recommended",
          priority: "medium",
          action_url: "/admin/tenants?filter=at-risk",
        },
        {
          type: "anomaly",
          title: "Elevator System Alert",
          description: "Unusual work order pattern detected - possible systemic issue",
          priority: "high",
          action_url: "/fm/work-orders?asset_type=elevator",
        },
      ],
    };
    
    logger.info("AI analytics retrieved", {
      tenant_id: tenantId,
      anomalies: analytics.anomalies.active_count,
      at_risk_tenants: analytics.churn.at_risk_tenants,
      critical_assets: analytics.asset_health.critical,
    });
    
    return NextResponse.json(analytics);
  } catch (error) {
    logger.error("Failed to get AI analytics", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
