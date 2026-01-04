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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collection-names";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Check for superadmin session as fallback (for /superadmin/* pages)
    const superadminSession = !session?.user ? await getSuperadminSession(request) : null;
    const isSuperadmin = !!superadminSession;
    
    // Demo mode check - allow unauthenticated access with demo data
    const isDemoMode = process.env.ENABLE_DEMO_MODE === "true";
    const isAuthenticated = !!session?.user || isSuperadmin;
    
    // Handle demo mode for unauthenticated users
    if (!isAuthenticated) {
      if (isDemoMode) {
        // Return demo analytics data - structure matches real response
        return NextResponse.json({
          is_demo: true,
          orgId: "demo",
          generated_at: new Date().toISOString(),
          
          // Anomaly Detection (matches real structure)
          anomalies: {
            active_count: 3,
            resolved_24h: 2,
            items: [
              {
                id: "ANO-001",
                type: "asset_health",
                severity: "high",
                description: "Demo: HVAC unit showing critical health score of 15%",
                detected_at: new Date().toISOString(),
                asset_id: "demo-asset-001",
                score: 0.85,
              },
              {
                id: "ANO-002",
                type: "asset_health",
                severity: "medium",
                description: "Demo: Elevator motor requires attention",
                detected_at: new Date().toISOString(),
                asset_id: "demo-asset-002",
                score: 0.55,
              },
            ],
          },
          
          // Churn Prediction (matches real structure)
          churn: {
            at_risk_tenants: 5,
            healthy_tenants: 145,
            predictions: [
              {
                tenant_name: "Demo Tenant A",
                risk_level: "medium",
                probability: 0.65,
                primary_factor: "Low activity in last 30 days",
                recommended_action: "Schedule customer success call",
                predicted_churn_date: null,
              },
            ],
          },
          
          // Asset Health (matches real structure)
          asset_health: {
            total_assets: 150,
            excellent: 75,
            good: 50,
            fair: 15,
            poor: 7,
            critical: 3,
            critical_assets: [
              {
                asset_id: "demo-asset-001",
                name: "Demo HVAC Unit",
                health_score: 15,
                rul_days: 5,
                failure_probability_30d: 0.85,
                recommended_action: "Immediate replacement required",
                estimated_cost_preventive: 5000,
                estimated_cost_reactive: 25000,
              },
            ],
          },
          
          // Summary Insights
          insights: [
            {
              type: "cost_saving",
              title: "Preventive Maintenance Opportunity",
              description: "3 critical asset(s) need immediate attention",
              priority: "high",
              action_url: "/fm/assets?filter=critical",
            },
          ],
        });
      }
      return NextResponse.json(
        { error: { code: 'FIXZIT-AUTH-001', message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    
    // Resolve orgId from session (NextAuth) or superadmin session
    const orgId = isSuperadmin 
      ? superadminSession.orgId 
      : (session?.user as { orgId?: string })?.orgId;
    if (!orgId || typeof orgId !== "string" || orgId.trim() === "") {
      return NextResponse.json(
        { error: { code: "FIXZIT-TENANT-001", message: "Organization required" } },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Query assets for health metrics
    const assetStats = await db.collection(COLLECTIONS.ASSETS).aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          excellent: { $sum: { $cond: [{ $gte: ["$healthScore", 90] }, 1, 0] } },
          good: { $sum: { $cond: [{ $and: [{ $gte: ["$healthScore", 70] }, { $lt: ["$healthScore", 90] }] }, 1, 0] } },
          fair: { $sum: { $cond: [{ $and: [{ $gte: ["$healthScore", 50] }, { $lt: ["$healthScore", 70] }] }, 1, 0] } },
          poor: { $sum: { $cond: [{ $and: [{ $gte: ["$healthScore", 30] }, { $lt: ["$healthScore", 50] }] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $lt: ["$healthScore", 30] }, 1, 0] } },
        }
      }
    ]).toArray();
    
    const stats = assetStats[0] ?? { total: 0, excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    
    // Get critical assets (health score < 30)
    const criticalAssets = await db.collection(COLLECTIONS.ASSETS).find(
      { orgId, healthScore: { $lt: 30 } },
      { projection: { _id: 1, name: 1, healthScore: 1, type: 1, lastMaintenanceDate: 1 } }
    ).limit(10).toArray();
    
    // Query work orders for anomaly detection (result used for future anomaly patterns)
    const [_workOrderStats] = await db.collection(COLLECTIONS.WORK_ORDERS).aggregate([
      { $match: { orgId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgCost: { $avg: "$totalCost" }
        }
      }
    ]).toArray() ?? [];
    
    // Query work orders created in last 24h for anomaly detection
    const recentWorkOrderCount = await db.collection(COLLECTIONS.WORK_ORDERS).countDocuments({
      orgId,
      createdAt: { $gte: twentyFourHoursAgo }
    });
    
    // Query tenants for churn prediction (for superadmin) or skip for regular users
    const churnData = { at_risk_tenants: 0, healthy_tenants: 0, predictions: [] as Array<Record<string, unknown>> };
    if (isSuperadmin) {
      const tenantStats = await db.collection(COLLECTIONS.TENANTS).aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            atRisk: { $sum: { $cond: [{ $lte: ["$lastActivityAt", thirtyDaysAgo] }, 1, 0] } }
          }
        }
      ]).toArray();
      
      if (tenantStats[0]) {
        churnData.at_risk_tenants = tenantStats[0].atRisk ?? 0;
        churnData.healthy_tenants = (tenantStats[0].total ?? 0) - (tenantStats[0].atRisk ?? 0);
      }
      
      // Get at-risk tenants
      const atRiskTenants = await db.collection(COLLECTIONS.TENANTS).find(
        { lastActivityAt: { $lte: thirtyDaysAgo } },
        { projection: { name: 1, lastActivityAt: 1 } }
      ).limit(5).toArray();
      
      churnData.predictions = atRiskTenants.map(t => ({
        tenant_name: t.name ?? "Unknown",
        risk_level: "medium",
        probability: 0.5,
        primary_factor: "Low activity in last 30 days",
        recommended_action: "Schedule customer success call",
        predicted_churn_date: null
      }));
    }
    
    // Build insights based on real data
    const insights: Array<{ type: string; title: string; description: string; priority: string; action_url: string }> = [];
    
    if (stats.critical > 0) {
      insights.push({
        type: "cost_saving",
        title: "Preventive Maintenance Opportunity",
        description: `${stats.critical} critical asset(s) need immediate attention`,
        priority: "high",
        action_url: "/fm/assets?filter=critical"
      });
    }
    
    if (churnData.at_risk_tenants > 0) {
      insights.push({
        type: "risk",
        title: "Churn Risk Alert",
        description: `${churnData.at_risk_tenants} tenant(s) showing low activity signals`,
        priority: "medium",
        action_url: "/admin/tenants?filter=at-risk"
      });
    }
    
    if (recentWorkOrderCount > 10) {
      insights.push({
        type: "anomaly",
        title: "High Work Order Volume",
        description: `${recentWorkOrderCount} work orders created in last 24 hours`,
        priority: "medium",
        action_url: "/fm/work-orders"
      });
    }
    
    // AI Analytics from real data
    const analytics = {
      is_demo: false,
      orgId,
      generated_at: now.toISOString(),
      
      // Anomaly Detection
      anomalies: {
        active_count: stats.critical,
        resolved_24h: 0, // Would require tracking resolved anomalies
        items: criticalAssets.slice(0, 5).map((asset, idx) => ({
          id: `ANO-${String(idx + 1).padStart(3, '0')}`,
          type: "asset_health",
          severity: asset.healthScore < 20 ? "high" : "medium",
          description: `Asset "${asset.name}" has critical health score of ${asset.healthScore}%`,
          detected_at: now.toISOString(),
          asset_id: String(asset._id),
          score: (100 - (asset.healthScore ?? 0)) / 100,
        })),
      },
      
      // Churn Prediction
      churn: churnData,
      
      // Asset Health
      asset_health: {
        total_assets: stats.total,
        excellent: stats.excellent,
        good: stats.good,
        fair: stats.fair,
        poor: stats.poor,
        critical: stats.critical,
        critical_assets: criticalAssets.map(asset => ({
          asset_id: String(asset._id),
          name: asset.name ?? "Unknown Asset",
          health_score: asset.healthScore ?? 0,
          rul_days: Math.max(0, Math.round((asset.healthScore ?? 0) / 3)),
          failure_probability_30d: Math.max(0, Math.min(1, (100 - (asset.healthScore ?? 0)) / 100)),
          recommended_action: (asset.healthScore ?? 0) < 20 ? "Immediate replacement required" : "Schedule maintenance",
          estimated_cost_preventive: 5000,
          estimated_cost_reactive: 25000,
        })),
      },
      
      // Summary Insights
      insights,
    };
    
    logger.info("AI analytics retrieved", {
      orgId,
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
