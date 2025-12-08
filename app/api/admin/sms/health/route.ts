import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSSettings } from "@/server/models/SMSSettings";
import { SMSMessage, TSMSProvider, SMSProvider } from "@/server/models/SMSMessage";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

interface ProviderHealthData {
  provider: TSMSProvider;
  enabled: boolean;
  configuredOrgs: number;
  last24h: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
    avgDeliveryMs: number | null;
    totalCost: number;
  };
  last7d: {
    total: number;
    delivered: number;
    failed: number;
    successRate: number;
    totalCost: number;
  };
  status: "healthy" | "degraded" | "unhealthy" | "unconfigured";
}

/**
 * GET /api/admin/sms/health
 *
 * Get SMS provider health statistics (Super Admin only)
 *
 * Returns:
 * - Per-provider health metrics
 * - Success rates, delivery times
 * - Cost tracking aggregates
 * - Overall system health status
 */
export async function GET(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id") || randomUUID();

  try {
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`/api/admin/sms/health:${clientIp}:GET`, 10, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all configured providers across orgs
    const allSettings = await SMSSettings.find({});
    const providerConfigCounts: Record<string, number> = {};

    for (const setting of allSettings) {
      for (const p of setting.providers || []) {
        if (p.enabled) {
          providerConfigCounts[p.provider] = (providerConfigCounts[p.provider] || 0) + 1;
        }
      }
    }

    // Aggregate provider stats
    const providerHealth: ProviderHealthData[] = [];

    for (const providerName of SMSProvider) {
      // 24h stats
      const stats24h = await SMSMessage.aggregate([
        {
          $match: {
            provider: providerName,
            createdAt: { $gte: last24h },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [{ $in: ["$status", ["PENDING", "QUEUED", "SENT"]] }, 1, 0],
              },
            },
            totalCost: { $sum: { $ifNull: ["$cost", 0] } },
            avgDeliveryMs: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$sentAt", null] }, { $ne: ["$createdAt", null] }] },
                  { $subtract: ["$sentAt", "$createdAt"] },
                  null,
                ],
              },
            },
          },
        },
      ]);

      // 7d stats
      const stats7d = await SMSMessage.aggregate([
        {
          $match: {
            provider: providerName,
            createdAt: { $gte: last7d },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
            },
            totalCost: { $sum: { $ifNull: ["$cost", 0] } },
          },
        },
      ]);

      const s24 = stats24h[0] || { total: 0, delivered: 0, failed: 0, pending: 0, totalCost: 0, avgDeliveryMs: null };
      const s7d = stats7d[0] || { total: 0, delivered: 0, failed: 0, totalCost: 0 };

      const configuredOrgs = providerConfigCounts[providerName] || 0;
      const successRate24h = s24.total > 0 ? (s24.delivered / s24.total) * 100 : 0;
      const successRate7d = s7d.total > 0 ? (s7d.delivered / s7d.total) * 100 : 0;

      // Determine health status
      let status: ProviderHealthData["status"] = "unconfigured";
      if (configuredOrgs > 0) {
        if (s24.total === 0) {
          status = "healthy"; // No messages yet is okay
        } else if (successRate24h >= 95) {
          status = "healthy";
        } else if (successRate24h >= 80) {
          status = "degraded";
        } else {
          status = "unhealthy";
        }
      }

      providerHealth.push({
        provider: providerName,
        enabled: configuredOrgs > 0,
        configuredOrgs,
        last24h: {
          total: s24.total,
          delivered: s24.delivered,
          failed: s24.failed,
          pending: s24.pending,
          successRate: Math.round(successRate24h * 100) / 100,
          avgDeliveryMs: s24.avgDeliveryMs ? Math.round(s24.avgDeliveryMs) : null,
          totalCost: s24.totalCost,
        },
        last7d: {
          total: s7d.total,
          delivered: s7d.delivered,
          failed: s7d.failed,
          successRate: Math.round(successRate7d * 100) / 100,
          totalCost: s7d.totalCost,
        },
        status,
      });
    }

    // Calculate overall health
    const activeProviders = providerHealth.filter((p) => p.enabled);
    const unhealthyCount = activeProviders.filter((p) => p.status === "unhealthy").length;
    const degradedCount = activeProviders.filter((p) => p.status === "degraded").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    }

    // Totals across all providers
    const totals24h = {
      total: providerHealth.reduce((sum, p) => sum + p.last24h.total, 0),
      delivered: providerHealth.reduce((sum, p) => sum + p.last24h.delivered, 0),
      failed: providerHealth.reduce((sum, p) => sum + p.last24h.failed, 0),
      pending: providerHealth.reduce((sum, p) => sum + p.last24h.pending, 0),
      totalCost: providerHealth.reduce((sum, p) => sum + p.last24h.totalCost, 0),
    };

    const totals7d = {
      total: providerHealth.reduce((sum, p) => sum + p.last7d.total, 0),
      delivered: providerHealth.reduce((sum, p) => sum + p.last7d.delivered, 0),
      failed: providerHealth.reduce((sum, p) => sum + p.last7d.failed, 0),
      totalCost: providerHealth.reduce((sum, p) => sum + p.last7d.totalCost, 0),
    };

    logger.info("[SMS Provider Health] Health check completed", {
      correlationId,
      overallStatus,
      activeProviders: activeProviders.length,
      totals24h,
    });

    return NextResponse.json({
      success: true,
      correlationId,
      overallStatus,
      providers: providerHealth,
      totals: {
        last24h: {
          ...totals24h,
          successRate: totals24h.total > 0 ? Math.round((totals24h.delivered / totals24h.total) * 10000) / 100 : 0,
        },
        last7d: {
          ...totals7d,
          successRate: totals7d.total > 0 ? Math.round((totals7d.delivered / totals7d.total) * 10000) / 100 : 0,
        },
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[SMS Provider Health] Error fetching health data", {
      correlationId,
      error: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch provider health data",
        correlationId,
      },
      { status: 500 }
    );
  }
}
