import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { logger } from "@/lib/logger";
import { WOStatus, WOPriority, type WorkOrderStats } from "@/types/fm";
import { FMErrors } from "../../errors";
import { requireFmAbility } from "../../utils/auth";
import { resolveTenantId } from "../../utils/tenant";

const FINAL_STATUSES = new Set<WOStatus>([
  WOStatus.CLOSED,
  WOStatus.FINANCIAL_POSTING,
  WOStatus.WORK_COMPLETE,
]);

export async function GET(req: NextRequest) {
  try {
    const actor = await requireFmAbility("VIEW")(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId || actor.tenantId,
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WORK_ORDERS);

    const match = { tenantId };

    const [total, statusAgg, priorityAgg, completionAgg] = await Promise.all([
      collection.countDocuments(match),
      collection
        .aggregate<{
          _id: WOStatus | string;
          count: number;
        }>([
          { $match: match },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      collection
        .aggregate<{
          _id: WOPriority | string;
          count: number;
        }>([
          { $match: match },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ])
        .toArray(),
      collection
        .aggregate<{
          avgCompletionTime: number;
          totalCompleted: number;
          slaMet: number;
          slaDefinedCount: number;
        }>([
          {
            $match: {
              tenantId,
              completedAt: { $ne: null },
              createdAt: { $ne: null },
            },
          },
          {
            $project: {
              diffHours: {
                $divide: [
                  { $subtract: ["$completedAt", "$createdAt"] },
                  1000 * 60 * 60,
                ],
              },
              slaHours: { $ifNull: ["$slaHours", null] },
            },
          },
          {
            $group: {
              _id: null,
              avgCompletionTime: { $avg: "$diffHours" },
              totalCompleted: { $sum: 1 },
              slaDefinedCount: {
                $sum: {
                  $cond: [{ $gt: ["$slaHours", 0] }, 1, 0],
                },
              },
              slaMet: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ["$slaHours", 0] },
                        { $lte: ["$diffHours", "$slaHours"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
    ]);

    const statusCounts = Object.fromEntries(
      statusAgg.map(({ _id, count }) => [_id ?? "UNKNOWN", count]),
    );
    const priorityCounts = Object.fromEntries(
      priorityAgg.map(({ _id, count }) => [_id ?? "UNKNOWN", count]),
    );

    const completionMetrics = completionAgg[0] ?? {
      avgCompletionTime: 0,
      totalCompleted: 0,
      slaMet: 0,
      slaDefinedCount: 0,
    };

    const now = new Date();
    const overdueCount = await collection.countDocuments({
      tenantId,
      completedAt: { $exists: false },
      slaHours: { $gt: 0 },
      createdAt: { $ne: null },
      status: { $nin: Array.from(FINAL_STATUSES) },
      $expr: {
        $gt: [
          now,
          {
            $add: ["$createdAt", { $multiply: ["$slaHours", 60 * 60 * 1000] }],
          },
        ],
      },
    });

    const stats: WorkOrderStats = {
      total,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      avgCompletionTime: Number(
        completionMetrics.avgCompletionTime?.toFixed?.(2) ?? 0,
      ),
      slaCompliance:
        completionMetrics.slaDefinedCount > 0
          ? Number(
              (
                (completionMetrics.slaMet / completionMetrics.slaDefinedCount) *
                100
              ).toFixed(2),
            )
          : 100,
      overdueCount,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    logger.error("FM Work Orders Stats API error", error as Error);
    return FMErrors.internalError();
  }
}
