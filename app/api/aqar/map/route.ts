import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";
import { AqarListing } from "@/server/models/aqar";

// Constants for clustering grid cell calculation
const MIN_CELL_SIZE_DEGREES = 0.01; // avoid excessive granularity
const LATITUDE_RANGE_DEGREES = 180; // -90..+90 total span
const ZOOM_EXPONENT_BASE = 2; // each zoom level doubles resolution

/**
 * @openapi
 * /api/aqar/map:
 *   get:
 *     summary: aqar/map operations
 *     tags: [aqar]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      user = {
        id: "guest",
        role: "SUPER_ADMIN" as unknown,
        orgId: "demo-tenant",
        tenantId: "demo-tenant",
      };
    }
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const { searchParams } = new URL(req.url);
    const n = Number(searchParams.get("n"));
    const s = Number(searchParams.get("s"));
    const e = Number(searchParams.get("e"));
    const w = Number(searchParams.get("w"));
    const z = Math.max(1, Math.min(20, Number(searchParams.get("z") || "10")));

    if ([n, s, e, w].some((v) => Number.isNaN(v))) {
      return createSecureResponse({ error: "Invalid bbox" }, 400, req);
    }

    const cell = Math.max(
      MIN_CELL_SIZE_DEGREES,
      LATITUDE_RANGE_DEGREES / Math.pow(ZOOM_EXPONENT_BASE, z + 2),
    );

    await connectToDatabase();

    const match: Record<string, unknown> = {
      status: "ACTIVE",
      "location.geo.coordinates.1": { $gte: s, $lte: n },
      "location.geo.coordinates.0": { $gte: w, $lte: e },
    };

    if (user?.orgId) {
      match.orgId = user.orgId;
    }

    const pipeline = [
      { $match: match },
      {
        $project: {
          lat: { $arrayElemAt: ["$location.geo.coordinates", 1] },
          lng: { $arrayElemAt: ["$location.geo.coordinates", 0] },
          price: "$price.amount",
          isAuction: "$auction.isAuction",
          rnplEligible: "$rnplEligible",
        },
      },
      {
        $addFields: {
          gx: { $multiply: [{ $floor: { $divide: ["$lat", cell] } }, cell] },
          gy: { $multiply: [{ $floor: { $divide: ["$lng", cell] } }, cell] },
        },
      },
      {
        $group: {
          _id: { gx: "$gx", gy: "$gy" },
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          lat: { $avg: "$lat" },
          lng: { $avg: "$lng" },
          auctions: { $sum: { $cond: ["$isAuction", 1, 0] } },
          rnpl: { $sum: { $cond: ["$rnplEligible", 1, 0] } },
        },
      },
      { $limit: 5000 },
    ];

    interface ClusterRow {
      _id: { gx: number; gy: number };
      count: number;
      avgPrice?: number;
      lat: number;
      lng: number;
      auctions?: number;
      rnpl?: number;
    }

    const rows = await AqarListing.aggregate(pipeline);
    const clusters = (rows as unknown as ClusterRow[]).map((r) => ({
      id: `${r._id.gx}:${r._id.gy}`,
      lat: r.lat,
      lng: r.lng,
      count: r.count,
      avgPrice: Math.round(r.avgPrice || 0),
      auctions: r.auctions || 0,
      rnpl: r.rnpl || 0,
    }));

    return createSecureResponse({ clusters }, 200, req);
  } catch {
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}
