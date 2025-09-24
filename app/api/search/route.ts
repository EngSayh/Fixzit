import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { Property } from "@/src/server/models/Property";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

type Hit = { id: string; type: string; title: string; href: string; subtitle?: string };

function clampLimit(raw: string | null): number {
  let lim = Number.parseInt((raw ?? "5"), 10);
  if (!Number.isFinite(lim)) lim = 5;
  lim = Math.max(1, Math.min(20, Math.floor(lim)));
  return lim;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "fm").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = clampLimit(searchParams.get("limit"));

  if (!q) return NextResponse.json({ results: [] });

  // Enforce auth and tenant scoping
  let tenantId: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: Hit[] = [];

    const searchFM = async () => {
      await db; // ensure mongoose is ready
      const woFilter: any = { deletedAt: { $exists: false }, tenantId };
      const safe = escapeRegex(q);
      const woQuery: any = q
        ? {
            $or: [
              { title: { $regex: safe, $options: "i" } },
              { description: { $regex: safe, $options: "i" } },
              { code: { $regex: safe, $options: "i" } },
            ],
          }
        : {};
      const woItems = await (WorkOrder as any)
        .find({ ...woFilter, ...woQuery })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();
      woItems.forEach((w: any) =>
        results.push({ id: String(w._id), type: "work_orders", title: w.title || w.code, href: `/work-orders/${w._id}`, subtitle: w.code })
      );

      const propFilter: any = { tenantId };
      const propQuery: any = q
        ? {
            $or: [
              { name: { $regex: safe, $options: "i" } },
              { description: { $regex: safe, $options: "i" } },
              { code: { $regex: safe, $options: "i" } },
              { "address.city": { $regex: safe, $options: "i" } },
            ],
          }
        : {};
      const props = await (Property as any)
        .find({ ...propFilter, ...propQuery })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();
      props.forEach((p: any) =>
        results.push({ id: String(p._id), type: "properties", title: p.name, href: `/properties/${p._id}`, subtitle: p.address?.city })
      );
    };

    if (scope === "fm") {
      await searchFM();
    } else if (scope === "souq") {
      const { products, vendors } = await getCollections();

      const productFilter: any = {
        active: true,
        tenantId,
        $or: [
          { title: { $regex: escapeRegex(q), $options: "i" } },
          { description: { $regex: escapeRegex(q), $options: "i" } },
          { sku: { $regex: escapeRegex(q), $options: "i" } },
        ],
      };
      const prodItems = await products.find(productFilter).limit(limit).toArray();
      prodItems.forEach((p: any) =>
        results.push({ id: String(p._id), type: "products", title: p.title, href: `/souq/catalog/${p._id}`, subtitle: p.sku })
      );

      const vendorFilter: any = {
        tenantId,
        $or: [
          { name: { $regex: escapeRegex(q), $options: "i" } },
          { "contact.primary.name": { $regex: escapeRegex(q), $options: "i" } },
        ],
      };
      const vendorItems = await vendors.find(vendorFilter).limit(limit).toArray();
      vendorItems.forEach((v: any) =>
        results.push({ id: String(v._id), type: "vendors", title: v.name, href: `/souq/vendors/${v._id}` })
      );
    } else if (scope === "aqar") {
      await db;
      const propFilter: any = { type: { $in: ["RESIDENTIAL", "COMMERCIAL"] }, tenantId };
      const propQuery: any = q
        ? {
            $or: [
              { name: { $regex: escapeRegex(q), $options: "i" } },
              { description: { $regex: escapeRegex(q), $options: "i" } },
              { code: { $regex: escapeRegex(q), $options: "i" } },
              { "address.city": { $regex: escapeRegex(q), $options: "i" } },
            ],
          }
        : {};
      const listings = await (Property as any)
        .find({ ...propFilter, ...propQuery })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();
      listings.forEach((p: any) =>
        results.push({ id: String(p._id), type: "listings", title: p.name, href: `/aqar/properties?highlight=${p._id}`, subtitle: p.address?.city })
      );
    } else {
      // Fallback to FM search
      await searchFM();
    }

    // De-duplicate by href
    const seen = new Set<string>();
    const deduped = results.filter((r) => (seen.has(r.href) ? false : (seen.add(r.href), true)));
    return NextResponse.json({ results: deduped.slice(0, 25) });
  } catch (err) {
    console.error("/api/search error", err);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}

