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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    // Allow demo mode when not authenticated (for development/demo)
    const isDemo = !session?.user;
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city")?.trim() || null;
    
    // Provider Network Data
    const providerNetwork = {
      generated_at: new Date().toISOString(),
      is_demo: isDemo,
      org_id: isDemo ? "demo" : ((session?.user as { org_id?: string })?.org_id ?? "1"),
      
      // Provider Statistics
      statistics: {
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
      },
      
      // Featured Providers
      featured: [
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
      ],
      
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
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by city if provided
    if (city) {
      providerNetwork.featured = providerNetwork.featured.filter(
        (p) => p.coverage?.some?.((c) => c.toLowerCase() === city.toLowerCase())
      );
    }
    
    logger.info("Provider network accessed", {
      user: session?.user?.email ?? "demo",
      total_providers: providerNetwork.statistics.total_providers,
      active_bids: providerNetwork.active_bids.total,
      filters: { category, city },
      cityFilterApplied: !!city,
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

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
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
    
    if (!work_order_id || !provider_id || !bid_amount) {
      return NextResponse.json(
        { error: { code: "FIXZIT-API-400", message: "Missing required fields: work_order_id, provider_id, bid_amount" } },
        { status: 400 }
      );
    }
    
    // Create bid
    const bid = {
      id: `bid-${Date.now()}`,
      work_order_id,
      provider_id,
      bid_amount_sar: bid_amount,
      estimated_hours: estimated_hours ?? null,
      notes: notes ?? null,
      submitted_at: new Date().toISOString(),
      status: "submitted",
      submitted_by: session.user.email,
    };
    
    logger.info("Bid submitted", {
      bid_id: bid.id,
      work_order_id,
      provider_id,
      bid_amount,
      submitted_by: session.user.email,
    });
    
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
