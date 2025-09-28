<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { WorkOrder } from "@/src/server/models/WorkOrder";
import type { WorkOrderDoc } from "@/src/server/models/WorkOrder";
import { Property } from "@/src/server/models/Property";
import type { PropertyDoc } from "@/src/server/models/Property";
import { makeQueryableModel, type QueryableModel } from "./queryHelpers";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
import { ACCESS } from "@/src/lib/rbac";
import { escapeRegex } from "@/src/lib/regex";

type Hit = { id: string; type: string; title: string; href: string; subtitle?: string };

function clampLimit(raw: string | null): number {
  let lim = Number.parseInt((raw ?? "5"), 10);
  if (!Number.isFinite(lim)) lim = 5;
  lim = Math.max(1, Math.min(20, lim));
  return lim;
=======
import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/mongo';
import { APPS, AppKey } from '@/src/config/topbar-modules';

export async function GET(req: NextRequest) {
  try {
  const mongoose = await connectDb(); // Ensure database connection
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;
    const q = (searchParams.get('q') || '').trim();
    const entities = (searchParams.get('entities') || '').split(',').filter(Boolean);

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const appConfig = APPS[app];
    if (!appConfig) {
      return NextResponse.json({ results: [] });
    }

    const searchEntities = entities.length > 0 ? entities : appConfig.searchEntities;
    const results: any[] = [];

    // Search across different entity types based on app
    for (const entity of searchEntities) {
      try {
        let collection: any;
        let searchQuery: any = { $text: { $search: q } };
        let projection: any = { score: { $meta: 'textScore' } };

        const mdb = (mongoose as any).connection?.db;
        if (!mdb) continue;
        switch (entity) {
          case 'work_orders':
            collection = mdb.collection('work_orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'properties':
            collection = mdb.collection('properties');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'units':
            collection = mdb.collection('units');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'tenants':
            collection = mdb.collection('tenants');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'vendors':
            collection = mdb.collection('vendors');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'invoices':
            collection = mdb.collection('invoices');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'products':
            collection = mdb.collection('products');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'services':
            collection = mdb.collection('services');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'rfqs':
            collection = mdb.collection('rfqs');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'orders':
            collection = mdb.collection('orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'listings':
            collection = mdb.collection('listings');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'projects':
            collection = mdb.collection('projects');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'agents':
            collection = mdb.collection('agents');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          default:
            continue;
        }

        if (collection) {
          const items = await collection
            .find(searchQuery)
            .project(projection)
            .sort({ score: { $meta: 'textScore' } })
            .limit(5)
            .toArray();

          items.forEach((item: any) => {
            const result = {
              id: item._id?.toString() || '',
              entity,
              title: item.title || item.name || item.code || `Untitled ${entity}`,
              subtitle: item.description || item.address || item.status || '',
              href: generateHref(entity, item._id?.toString() || ''),
              score: item.score || 0
            };
            results.push(result);
          });
        }
      } catch (error) {
        console.warn(`Search failed for entity ${entity}:`, error);
        // Continue with other entities
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return NextResponse.json({ results: results.slice(0, 20) });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "fm").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = clampLimit(searchParams.get("limit"));

  if (!q) return NextResponse.json({ results: [] });

  // Enforce auth and tenant scoping
  let tenantId: string;
  let userRole: string;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
    userRole = String(user.role);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-scope RBAC guard
  const allowedModules = ACCESS[userRole as keyof typeof ACCESS] || [];
  const forbid = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (scope === 'souq' && !allowedModules.includes('marketplace')) return forbid();
  if (scope === 'aqar' && !allowedModules.includes('properties')) return forbid();
  if (scope === 'fm' && !(allowedModules.includes('work-orders') || allowedModules.includes('properties'))) return forbid();

  try {
    const results: Hit[] = [];

    const WorkOrderModel = makeQueryableModel<WorkOrderDoc>(WorkOrder);
    const PropertyModel = makeQueryableModel<PropertyDoc>(Property);

    const searchFM = async () => {
      await db; // ensure mongoose is ready
      const safe = escapeRegex(q);
      // Return only datasets the role can access
      if (allowedModules.includes('work-orders')) {
        const woFilter: any = { deletedAt: { $exists: false }, tenantId };
        const woQuery: any = q
          ? {
              $or: [
                { title: { $regex: safe, $options: "i" } },
                { description: { $regex: safe, $options: "i" } },
                { code: { $regex: safe, $options: "i" } },
              ],
            }
          : {};
        const woItems = await WorkOrderModel
          .find({ ...woFilter, ...woQuery })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        woItems.forEach((w: any) =>
          results.push({ id: String(w._id), type: "work_orders", title: w.title || w.code, href: `/work-orders/${w._id}`, subtitle: w.code })
        );
      }
      if (allowedModules.includes('properties')) {
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
        const props = await PropertyModel
          .find({ ...propFilter, ...propQuery })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        props.forEach((p: any) =>
          results.push({ id: String(p._id), type: "properties", title: p.name, href: `/properties/${p._id}`, subtitle: p.address?.city })
        );
      }
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
      const listings = await PropertyModel
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

    // De-duplicate by href (clearer loop)
    const seen = new Set<string>();
    const deduped: Hit[] = [];
    for (const r of results) {
      if (!seen.has(r.href)) {
        seen.add(r.href);
        deduped.push(r);
      }
    }
    return NextResponse.json({ results: deduped.slice(0, 25) });
  } catch (err) {
    console.error("/api/search error", err);
    return NextResponse.json({ error: "Search service temporarily unavailable" }, { status: 500 });
  }
}
