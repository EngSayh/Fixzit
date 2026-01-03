/**
 * FM Provider Network API
 * 
 * Provider marketplace and bidding system:
 * - Available providers
 * - Active bids
 * - Provider ratings
 * - SLA tracking
 * 
 * @route GET /api/fm/providers
 * @route POST /api/fm/providers
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getProviderStatistics, getFeaturedProviders, type ServiceProvider, type ServiceArea, type ProviderCertification } from "@/services/fm/provider-network";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute for GET
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await smartRateLimit(`fm:providers:get:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt ?? 60000) / 1000)) } }
      );
    }

    const session = await auth();
    
    // Check for superadmin session as fallback (for /superadmin/* pages)
    const superadminSession = !session?.user ? await getSuperadminSession(request) : null;
    const isSuperadmin = !!superadminSession;
    
    // Allow demo mode only when not authenticated AND demo mode is explicitly enabled
    const isDemo = !session?.user && !isSuperadmin && process.env.ENABLE_DEMO_MODE === "true";
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city")?.trim() || null;
    
    // Resolve org_id before constructing payload (support NextAuth, superadmin, or demo)
    let org_id: string;
    if (isDemo) {
      org_id = "demo";
    } else if (isSuperadmin) {
      org_id = superadminSession.orgId;
    } else {
      const sessionOrgId = (session?.user as { orgId?: string })?.orgId;
      if (!sessionOrgId) {
        logger.error("[FM Providers] Authenticated user missing orgId - rejecting request");
        return NextResponse.json(
          { error: { code: "FIXZIT-TENANT-001", message: "Organization ID required for authenticated users" } },
          { status: 400 }
        );
      }
      org_id = sessionOrgId;
    }
    
    // Query real provider data from database (with mock data fallback for demo/empty collections)
    const [statistics, featuredProviders] = await Promise.all([
      isDemo ? null : getProviderStatistics(org_id),
      isDemo ? [] : getFeaturedProviders(org_id, 5),
    ]);
    
    // Check if we have real data or need fallback
    const hasRealData = !isDemo && statistics && statistics.total_providers > 0;
    
    // Default mock statistics for demo mode or empty collections
    const mockStatistics = {
      total_providers: 156,
      verified_providers: 142,
      active_this_month: 89,
      avg_rating: 4.3,
      avg_response_time_min: 45,
      categories: [
        { name: "HVAC", count: 34, avg_rating: 4.4 },
        { name: "Electrical", count: 28, avg_rating: 4.2 },
        { name: "Plumbing", count: 25, avg_rating: 4.5 },
        { name: "Cleaning", count: 42, avg_rating: 4.1 },
        { name: "Security Systems", count: 15, avg_rating: 4.6 },
        { name: "Landscaping", count: 12, avg_rating: 4.3 },
      ],
    };
    
    // Transform real providers to API response format or use mock
    const transformedFeatured = featuredProviders.length > 0
      ? featuredProviders.map((p: ServiceProvider) => ({
          id: p._id.toString(),
          name: p.company_name,
          category: p.capabilities?.[0]?.category || "General",
          verified: p.verification_status === "verified",
          rating: p.average_rating || 0,
          reviews_count: 0, // Would need separate query
          jobs_completed: p.total_jobs_completed || 0,
          response_time_min: 45, // Would need response time tracking
          hourly_rate_sar: p.hourly_rate_range?.min || 0,
          coverage: p.service_areas?.map((a: ServiceArea) => a.city) || [],
          certifications: p.certifications?.map((c: ProviderCertification) => c.name) || [],
          sla_compliance: p.on_time_rate ? p.on_time_rate * 100 : 95,
          badges: p.performance_score >= 90 ? ["top_rated", "verified_business"] : ["verified_business"],
        }))
      : [
          // Mock featured providers for demo/fallback
          {
            id: "prov-001",
            name: "Al-Rashid HVAC Services",
            category: "HVAC",
            verified: true,
            rating: 4.8,
            reviews_count: 156,
            jobs_completed: 423,
            response_time_min: 30,
            hourly_rate_sar: 150,
            coverage: ["Riyadh", "Jeddah", "Dammam"],
            certifications: ["ISO 9001", "SASO Certified", "Green Building"],
            sla_compliance: 98.5,
            badges: ["top_rated", "fast_response", "verified_business"],
          },
          {
            id: "prov-002",
            name: "Gulf Electrical Solutions",
            category: "Electrical",
            verified: true,
            rating: 4.7,
            reviews_count: 89,
            jobs_completed: 267,
            response_time_min: 45,
            hourly_rate_sar: 175,
            coverage: ["Riyadh", "Khobar"],
            certifications: ["SEC Licensed", "Safety Certified"],
            sla_compliance: 96.2,
            badges: ["top_rated", "verified_business"],
          },
          {
            id: "prov-003",
            name: "Crystal Clean Services",
            category: "Cleaning",
            verified: true,
            rating: 4.5,
            reviews_count: 312,
            jobs_completed: 1245,
            response_time_min: 60,
            hourly_rate_sar: 80,
            coverage: ["Riyadh"],
            certifications: ["COVID-19 Safety", "Green Cleaning"],
            sla_compliance: 94.8,
            badges: ["high_volume", "eco_friendly"],
          },
        ];
    
    // Build provider network response
    const providerNetwork = {
      generated_at: new Date().toISOString(),
      is_demo: isDemo || !hasRealData,
      org_id,
      
      // Use real statistics if available, otherwise mock
      statistics: hasRealData ? statistics : mockStatistics,
      
      // Featured providers (real or mock)
      featured: transformedFeatured,
      
      // Active Bids
      active_bids: {
        total: 12,
        pending_review: 5,
        bids: [
          {
            id: "bid-001",
            work_order_id: "WO-2024-001234",
            work_order_title: "HVAC Maintenance - Building A",
            category: "HVAC",
            submissions: 4,
            lowest_bid_sar: 2500,
            highest_bid_sar: 4200,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: "accepting_bids",
            top_bidder: {
              provider_id: "prov-001",
              provider_name: "Al-Rashid HVAC Services",
              bid_amount_sar: 2500,
              estimated_duration_hours: 8,
              rating: 4.8,
            },
          },
          {
            id: "bid-002",
            work_order_id: "WO-2024-001235",
            work_order_title: "Emergency Electrical Repair",
            category: "Electrical",
            submissions: 2,
            lowest_bid_sar: 800,
            highest_bid_sar: 1200,
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: "urgent",
            top_bidder: {
              provider_id: "prov-002",
              provider_name: "Gulf Electrical Solutions",
              bid_amount_sar: 800,
              estimated_duration_hours: 2,
              rating: 4.7,
            },
          },
        ],
      },
      
      // SLA Performance
      sla_performance: {
        overall_compliance: 96.3,
        by_category: [
          { category: "HVAC", compliance: 98.5, violations: 2 },
          { category: "Electrical", compliance: 96.2, violations: 5 },
          { category: "Plumbing", compliance: 97.8, violations: 3 },
          { category: "Cleaning", compliance: 94.1, violations: 12 },
        ],
        recent_violations: [
          {
            id: "vio-001",
            provider: "Quick Clean Co",
            type: "response_time_exceeded",
            work_order_id: "WO-2024-001198",
            exceeded_by_min: 45,
            penalty_sar: 150,
            status: "penalized",
          },
        ],
      },
      
      // Quick Actions
      quick_actions: [
        { id: "post_job", label: "Post New Job", icon: "plus-circle" },
        { id: "invite_provider", label: "Invite Provider", icon: "user-plus" },
        { id: "view_contracts", label: "View Contracts", icon: "file-text" },
        { id: "sla_report", label: "SLA Report", icon: "bar-chart" },
      ],
    };
    
    // Filter by category if provided
    if (category) {
      providerNetwork.featured = providerNetwork.featured.filter(
        (p: { category: string }) => p.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by city if provided
    if (city) {
      providerNetwork.featured = providerNetwork.featured.filter(
        (p: { coverage?: string[] }) => p.coverage?.some?.((c: string) => c.toLowerCase() === city.toLowerCase())
      );
    }
    
    logger.info("Provider network accessed", {
      user_id: isSuperadmin ? `superadmin:${superadminSession.username}` : (session?.user?.id ?? "demo"),
      total_providers: providerNetwork.statistics.total_providers,
      active_bids: providerNetwork.active_bids.total,
      filters: { category, city },
      cityFilterApplied: !!city,
      isSuperadmin,
    });
    
    return NextResponse.json(providerNetwork);
  } catch (error) {
    logger.error("Failed to get provider network", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for POST (bid submissions): 10 requests per minute
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await smartRateLimit(`fm:providers:post:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt ?? 60000) / 1000)) } }
      );
    }

    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    
    // Validate orgId for tenant isolation (same pattern as GET handler)
    const sessionOrgId = (session.user as { orgId?: string })?.orgId;
    if (!sessionOrgId) {
      logger.error("[FM Providers] Authenticated user missing orgId - rejecting request");
      return NextResponse.json(
        { error: { code: "FIXZIT-TENANT-001", message: "Organization ID required for authenticated users" } },
        { status: 400 }
      );
    }
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "FIXZIT-API-400", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }
    
    const { work_order_id, provider_id, bid_amount, estimated_hours, notes } = body as {
      work_order_id?: string;
      provider_id?: string;
      bid_amount?: number;
      estimated_hours?: number;
      notes?: string;
    };
    
    if (work_order_id == null || provider_id == null || bid_amount == null) {
      return NextResponse.json(
        { error: { code: "FIXZIT-API-400", message: "Missing required fields: work_order_id, provider_id, bid_amount" } },
        { status: 400 }
      );
    }
    
    // Tenant isolation: verify work_order_id belongs to user's organization
    try {
      const db = await getDatabase();
      const workOrderObjectId = ObjectId.isValid(work_order_id) ? new ObjectId(work_order_id) : null;
      if (!workOrderObjectId) {
        return NextResponse.json(
          { error: { code: "FIXZIT-API-400", message: "Invalid work_order_id format" } },
          { status: 400 }
        );
      }
      const workOrder = await db.collection(COLLECTIONS.WORK_ORDERS).findOne({
        _id: workOrderObjectId,
        orgId: sessionOrgId,
      });
      
      if (!workOrder) {
        logger.warn("[FM Providers] Work order not found or not owned by org", {
          work_order_id,
          orgId: sessionOrgId,
          userId: session.user.id,
        });
        return NextResponse.json(
          { error: { code: "FIXZIT-TENANT-002", message: "Work order not found or access denied" } },
          { status: 403 }
        );
      }
    } catch (dbError) {
      logger.error("[FM Providers] Failed to verify work order ownership", { 
        error: dbError instanceof Error ? dbError.message : "Unknown error",
        work_order_id,
        orgId: sessionOrgId,
      });
      return NextResponse.json(
        { error: { code: "FIXZIT-API-500", message: "Failed to verify work order" } },
        { status: 500 }
      );
    }
    
    const normalizedBidAmount = Number(bid_amount);
    if (!Number.isFinite(normalizedBidAmount) || normalizedBidAmount < 0) {
      return NextResponse.json(
        { error: { code: "FIXZIT-API-400", message: "bid_amount must be a valid non-negative number" } },
        { status: 400 }
      );
    }
    
    // Create bid with UUID to prevent collisions
    const bid = {
      id: `bid-${randomUUID()}`,
      work_order_id,
      provider_id,
      bid_amount_sar: normalizedBidAmount,
      estimated_hours: estimated_hours ?? null,
      notes: notes ?? null,
      submitted_at: new Date().toISOString(),
      status: "submitted",
      submitted_by: session.user.id, // Use user ID instead of email for PII protection
      orgId: sessionOrgId, // Include for tenant isolation
    };
    
    // Persist bid to database
    try {
      const db = await getDatabase();
      await db.collection("fm_bids").insertOne({
        ...bid,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      logger.info("Bid submitted and persisted", {
        bid_id: bid.id,
        work_order_id,
        provider_id,
        bid_amount: normalizedBidAmount,
        submitted_by_id: session.user.id,
      });
    } catch (persistError) {
      logger.error("[FM Providers] Failed to persist bid to database", {
        error: persistError instanceof Error ? persistError.message : "Unknown error",
        bid_id: bid.id,
        work_order_id,
      });
      return NextResponse.json(
        { error: { code: "FIXZIT-API-500", message: "Failed to save bid" } },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      bid,
      message: "Bid submitted successfully",
    }, { status: 201 });
  } catch (error) {
    logger.error("Failed to submit bid", { error });
    return NextResponse.json(
      { error: { code: "FIXZIT-API-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
