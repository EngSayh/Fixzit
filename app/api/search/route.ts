import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import { Property } from "@/src/server/models/Property";
import { getCollections } from "@/lib/db/collections";

type Hit = { id: string; type: string; title: string; href: string; subtitle?: string };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "fm").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 5), 20);

  if (!q) return NextResponse.json({ results: [] });

  // Optional tenant scoping via x-user header (JSON)
  let tenantId: string | undefined;
  try {
    const hdr = req.headers.get("x-user");
    if (hdr) tenantId = JSON.parse(hdr).tenantId;
  } catch {}

  try {
    const results: Hit[] = [];

    if (scope === "fm") {
      await db; // ensure mongoose is ready
      const woFilter: any = { deletedAt: { $exists: false } };
      if (tenantId) woFilter.tenantId = tenantId;
      // Use text search if index exists; always provide regex fallback
      const woQuery: any = q
        ? {
            $or: [
              { title: { $regex: q, $options: "i" } },
              { description: { $regex: q, $options: "i" } },
              { code: { $regex: q, $options: "i" } },
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

      const propFilter: any = {};
      if (tenantId) propFilter.tenantId = tenantId;
      const propQuery: any = q
        ? {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { description: { $regex: q, $options: "i" } },
              { code: { $regex: q, $options: "i" } },
              { "address.city": { $regex: q, $options: "i" } },
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
    } else if (scope === "souq") {
      const { products, vendors } = await getCollections();

      const productFilter: any = {
        active: true,
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { sku: { $regex: q, $options: "i" } },
        ],
      };
      const prodItems = await products.find(productFilter).limit(limit).toArray();
      prodItems.forEach((p: any) =>
        results.push({ id: String(p._id), type: "products", title: p.title, href: `/souq/catalog/${p._id}`, subtitle: p.sku })
      );

      const vendorFilter: any = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { "contact.primary.name": { $regex: q, $options: "i" } },
        ],
      };
      const vendorItems = await vendors.find(vendorFilter).limit(limit).toArray();
      vendorItems.forEach((v: any) =>
        results.push({ id: String(v._id), type: "vendors", title: v.name, href: `/souq/vendors/${v._id}` })
      );
    } else if (scope === "aqar") {
      await db;
      const propFilter: any = { type: { $in: ["RESIDENTIAL", "COMMERCIAL"] } };
      if (tenantId) propFilter.tenantId = tenantId;
      const propQuery: any = q
        ? {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { description: { $regex: q, $options: "i" } },
              { code: { $regex: q, $options: "i" } },
              { "address.city": { $regex: q, $options: "i" } },
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
      // Fallback to FM
      await db;
      const woItems = await (WorkOrder as any)
        .find({ $or: [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }, { code: { $regex: q, $options: "i" } }] })
        .limit(limit)
        .lean();
      woItems.forEach((w: any) => results.push({ id: String(w._id), type: "work_orders", title: w.title || w.code, href: `/work-orders/${w._id}` }));
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

