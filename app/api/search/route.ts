// app/api/search/route.ts - بحث فعلي مرتبط بقاعدة البيانات (Module-aware)
import { NextRequest, NextResponse } from 'next/server';
import db, { isMockDB } from '@/src/lib/mongo';
import { getCurrentUser } from '@/src/lib/auth/session';
import {
  WorkOrder,
  Property,
  Tenant,
  Vendor,
  Invoice,
  Product,
  RFQ,
  Order,
  Project,
} from '@/src/server/models';
import Listing from '@/src/server/models/Listing';

export const dynamic = 'force-dynamic';

type Hit = { id: string; type: string; title: string; subtitle?: string; href: string };

/**
 * Handles GET search requests and returns aggregated search hits across application modules.
 *
 * Parses query parameters (`q`, `scope`, `module`, `limit`) from the request URL, scopes results
 * to the current user's tenant/org when available, and performs cross-entity searches (FM,
 * marketplace/souq, and aqar/real-estate) according to the requested module scope. If `q` is
 * empty the endpoint returns an empty results array. Limits results per entity and aggregates
 * hits into a standardized `Hit` shape { id, type, title, subtitle, href }.
 *
 * On success returns a JSON response with `{ results: Hit[] }`. On unexpected errors returns a
 * 500 response with an empty results array.
 *
 * Query parameters:
 * - `q` (string): search query (trimmed). If empty the response contains no results.
 * - `scope` ('module' | 'all'): whether to search only the specified module (default: 'module')
 *   or across all modules ('all').
 * - `module` (string): module identifier used to select which module to search when `scope=module`
 *   (default: 'home').
 * - `limit` (number): requested total limit (normalized to 1..25); used to compute per-entity limits.
 *
 * @returns A NextResponse containing JSON `{ results: Hit[] }`. Returns HTTP 500 with `{ results: [] }`
 *          on error.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get('q') || '').trim();
    const scope = (searchParams.get('scope') || 'module') as 'module' | 'all';
    const moduleId = (searchParams.get('module') || 'home').toString();
    const limitParam = Math.max(1, Math.min(25, parseInt(searchParams.get('limit') || '0', 10) || 0));
    const limitPerEntity = limitParam || 8;

    // derive tenant/org scoping when available
    const user = await getCurrentUser(req);
    const tenantId = user?.tenantId;
    const orgId = user?.orgId;

    if (!q) return NextResponse.json({ results: [] });

    // تأكد من الاتصال بقاعدة البيانات عند عدم استخدام محاكٍ
    if (!isMockDB) {
      await db();
    }

    const results: Hit[] = [];

    const runFM = async () => {
      await Promise.all([
        (async () => {
          try {
            // استخدم $text إن أمكن، وإلا فارجِع إلى regex
            let rows: any[] = [];
            try {
              rows = await (WorkOrder as any).find({
                ...(tenantId ? { tenantId } : {}),
                $text: { $search: q },
              }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limitPerEntity).lean();
            } catch {
              rows = await (WorkOrder as any).find({
                ...(tenantId ? { tenantId } : {}),
                $or: [
                  { title: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                ],
              }).limit(limitPerEntity).lean();
            }
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'work-order', title: r.title ?? r.code ?? 'Work Order', subtitle: r.status, href: `/work-orders/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            const rows = await (Property as any).find({
              ...(tenantId ? { tenantId } : {}),
              $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'address.city': { $regex: q, $options: 'i' } },
              ],
            }).limit(limitPerEntity).lean();
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'property', title: r.name, subtitle: r.address?.city, href: `/properties/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            const rows = await (Tenant as any).find({
              ...(tenantId ? { tenantId } : {}),
              $or: [
                { name: { $regex: q, $options: 'i' } },
                { 'contact.primary.email': { $regex: q, $options: 'i' } },
              ],
            }).limit(limitPerEntity).lean();
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'tenant', title: r.name, subtitle: r.address?.current?.city, href: `/tenants/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            const rows = await (Vendor as any).find({
              ...(tenantId ? { tenantId } : {}),
              $or: [
                { name: { $regex: q, $options: 'i' } },
                { 'contact.primary.email': { $regex: q, $options: 'i' } },
                { 'business.specializations': { $regex: q, $options: 'i' } },
              ],
            }).limit(limitPerEntity).lean();
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'vendor', title: r.name, subtitle: r.contact?.primary?.city, href: `/vendors/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            const rows = await (Invoice as any).find({
              ...(tenantId ? { tenantId } : {}),
              $or: [
                { number: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'recipient.name': { $regex: q, $options: 'i' } },
              ],
            }).limit(limitPerEntity).lean();
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'invoice', title: `Invoice ${r.number}`, subtitle: r.status, href: `/finance/invoices/${r._id}` });
            }
          } catch {}
        })(),
      ]);
    };

    const runSouq = async () => {
      await Promise.all([
        (async () => {
          try {
            // استخدم فهرس النصوص إن توفّر
            let rows: any[] = [];
            try {
              rows = await (Product as any).search(q, { limit: limitPerEntity });
            } catch {
              rows = await (Product as any).find({
                $or: [
                  { name: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                  { tags: { $regex: q, $options: 'i' } },
                ],
              }).limit(limitPerEntity).lean();
            }
            for (const r of rows) {
              results.push({ id: String(r._id), type: r.type === 'service' ? 'service' : 'product', title: r.name, subtitle: r.sku ?? r.category, href: `/souq/${r.type === 'service' ? 'services' : 'products'}/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            let rows: any[] = [];
            try {
              rows = await (RFQ as any).find({
                ...(tenantId ? { tenantId } : {}),
                $text: { $search: q },
              }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limitPerEntity).lean();
            } catch {
              rows = await (RFQ as any).find({
                ...(tenantId ? { tenantId } : {}),
                $or: [
                  { title: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                  { category: { $regex: q, $options: 'i' } },
                ],
              }).limit(limitPerEntity).lean();
            }
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'rfq', title: r.title, subtitle: r.category, href: `/marketplace/rfq?rfq=${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            let rows: any[] = [];
            try {
              rows = await (Order as any).find({
                ...(orgId ? { orgId } : {}),
                $text: { $search: q },
              }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limitPerEntity).lean();
            } catch {
              rows = await (Order as any).find({
                ...(orgId ? { orgId } : {}),
                $or: [
                  { status: { $regex: q, $options: 'i' } },
                  { currency: { $regex: q, $options: 'i' } },
                ],
              }).limit(limitPerEntity).lean();
            }
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'order', title: `Order ${r._id}`, subtitle: r.status, href: `/souq/orders` });
            }
          } catch {}
        })(),
      ]);
    };

    const runAqar = async () => {
      await Promise.all([
        (async () => {
          try {
            // Listing لا يحتوي فهرس نصي صريح؛ استخدم regex على العناوين/الأوصاف
            const rows = await (Listing as any).find({
              ...(tenantId ? { tenantId } : {}),
              $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'property.location.city': { $regex: q, $options: 'i' } },
              ],
            }).limit(limitPerEntity).lean();
            for (const r of rows) {
              const isProperty = r.type === 'property';
              results.push({ id: String(r._id), type: isProperty ? 'listing' : 'material-listing', title: r.title, subtitle: r.property?.location?.city, href: isProperty ? `/marketplace/properties/${r._id}` : `/marketplace/materials/${r._id}` });
            }
          } catch {}
        })(),
        (async () => {
          try {
            let rows: any[] = [];
            try {
              rows = await (Project as any).find({
                ...(tenantId ? { tenantId } : {}),
                $text: { $search: q },
              }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limitPerEntity).lean();
            } catch {
              rows = await (Project as any).find({
                ...(tenantId ? { tenantId } : {}),
                $or: [
                  { name: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                  { type: { $regex: q, $options: 'i' } },
                ],
              }).limit(limitPerEntity).lean();
            }
            for (const r of rows) {
              results.push({ id: String(r._id), type: 'project', title: r.name, subtitle: r.type, href: `/aqar/projects` });
            }
          } catch {}
        })(),
      ]);
    };

    const isMarketplaceMaterials = moduleId.includes('marketplace-materials');
    const isMarketplaceRealEstate = moduleId.includes('marketplace-real-estate') || moduleId.includes('aqar');
    const isFMModule = !isMarketplaceMaterials && !isMarketplaceRealEstate;

    if (scope === 'all') {
      await Promise.all([runFM(), runSouq(), runAqar()]);
    } else {
      if (isFMModule) await runFM();
      if (isMarketplaceMaterials) await runSouq();
      if (isMarketplaceRealEstate) await runAqar();
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
