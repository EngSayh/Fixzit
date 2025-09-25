import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { getDatabase } from '@/lib/mongodb';

type Hit = { id: string; entity: string; title: string; subtitle?: string; href: string };

function mapHref(app: 'fm'|'souq'|'aqar', entity: string, id: any): string {
  const _id = typeof id === 'string' ? id : String(id);
  if (app === 'fm') {
    if (entity === 'work_orders') return `/work-orders/${_id}`;
    if (entity === 'properties') return `/properties/${_id}`;
    if (entity === 'tenants') return `/fm/tenants/${_id}`;
    if (entity === 'vendors') return `/fm/vendors/${_id}`;
    if (entity === 'invoices') return `/finance/invoices/${_id}`;
  }
  if (app === 'souq') {
    if (entity === 'products' || entity === 'services') return `/marketplace/items/${_id}`;
    if (entity === 'vendors') return `/marketplace/vendors/${_id}`;
    if (entity === 'rfqs') return `/marketplace/rfqs/${_id}`;
    if (entity === 'orders') return `/marketplace/orders/${_id}`;
  }
  if (app === 'aqar') {
    if (entity === 'listings') return `/aqar/listings/${_id}`;
    if (entity === 'projects') return `/aqar/projects/${_id}`;
    if (entity === 'agents') return `/aqar/agents/${_id}`;
  }
  return `/${entity}/${_id}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawApp = (url.searchParams.get('app') || 'fm').toLowerCase();
  const app = (rawApp === 'fm' || rawApp === 'souq' || rawApp === 'aqar' ? rawApp : 'fm') as 'fm'|'souq'|'aqar';
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json([], { status: 200 });

  const db = await getDatabase().catch(() => null);

  // Provide safe fallback if DB is not reachable (no placeholders)
  if (!db) return NextResponse.json([]);

  // Enforce authentication and tenant scoping
  let tenantId: string | null = null;
  let userRole: string | null = null;
  try {
    const user = await getSessionUser(req);
    tenantId = user.tenantId;
    // basic role capture; extend to roles array if available
    // @ts-ignore dynamic
    userRole = (user?.role as string) || (Array.isArray((user as any)?.roles) ? (user as any).roles[0] : null);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hits: Hit[] = [];
  // Gate collections by role (minimal; align to your 14‑role matrix as needed)
  const allow = (collection: string) => {
    const role = (userRole || '').toUpperCase();
    const FM = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','FM_MANAGER','TECHNICIAN','SUPPORT','AUDITOR']);
    const FIN = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','FINANCE','AUDITOR']);
    const SOUQ = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','PROCUREMENT','VENDOR','AUDITOR']);
    const AQAR = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','OWNER','AUDITOR']);
    switch (collection) {
      case 'workOrders':
      case 'properties':
      case 'tenants':
      case 'vendors':
        return FM.has(role) || (collection === 'vendors' && SOUQ.has(role));
      case 'invoices':
        return FIN.has(role);
      case 'products':
      case 'rfqs':
      case 'orders':
        return SOUQ.has(role);
      case 'listings':
      case 'projects':
      case 'agents':
        return AQAR.has(role);
      default:
        return false;
    }
  };
  try {
    if (app === 'fm') {
      const [wos, props, tenants, vendors, invoices] = await Promise.all([
        allow('workOrders') ? db.collection('workOrders').find({ tenantId, $text: { $search: q } }).project({ title: 1, code: 1 }).limit(8).toArray() : [],
        allow('properties') ? db.collection('properties').find({ tenantId, $text: { $search: q } }).project({ name: 1, address: 1 }).limit(6).toArray() : [],
        allow('tenants') ? db.collection('tenants').find({ tenantId, $text: { $search: q } }).project({ name: 1, code: 1 }).limit(6).toArray() : [],
        allow('vendors') ? db.collection('vendors').find({ tenantId, $text: { $search: q } }).project({ name: 1 }).limit(6).toArray() : [],
        allow('invoices') ? db.collection('invoices').find({ tenantId, $text: { $search: q } }).project({ invoiceNumber: 1, status: 1 }).limit(6).toArray() : [],
      ]);
      wos.forEach((r: any) => hits.push({ id: String(r._id), entity: 'work_orders', title: r.title || r.code || `WO ${r._id}`, href: mapHref(app, 'work_orders', r._id) }));
      props.forEach((r: any) => hits.push({ id: String(r._id), entity: 'properties', title: r.name || `Property ${r._id}`, subtitle: r.address?.city, href: mapHref(app, 'properties', r._id) }));
      tenants.forEach((r: any) => hits.push({ id: String(r._id), entity: 'tenants', title: r.name || `Tenant ${r._id}`, href: mapHref(app, 'tenants', r._id) }));
      vendors.forEach((r: any) => hits.push({ id: String(r._id), entity: 'vendors', title: r.name || `Vendor ${r._id}`, href: mapHref(app, 'vendors', r._id) }));
      invoices.forEach((r: any) => hits.push({ id: String(r._id), entity: 'invoices', title: r.invoiceNumber ? `Invoice ${r.invoiceNumber}` : `Invoice ${r._id}`, href: mapHref(app, 'invoices', r._id) }));
    } else if (app === 'souq') {
      const [products, rfqs, orders, vendors] = await Promise.all([
        allow('products') ? db.collection('products').find({ tenantId, $text: { $search: q } }).project({ name: 1, sku: 1 }).limit(10).toArray() : [],
        allow('rfqs') ? db.collection('rfqs').find({ tenantId, $text: { $search: q } }).project({ title: 1, status: 1 }).limit(6).toArray() : [],
        allow('orders') ? db.collection('orders').find({ tenantId, $text: { $search: q } }).project({ orderNumber: 1, status: 1 }).limit(6).toArray() : [],
        allow('vendors') ? db.collection('vendors').find({ tenantId, $text: { $search: q } }).project({ name: 1 }).limit(6).toArray() : [],
      ]);
      products.forEach((r: any) => hits.push({ id: String(r._id), entity: 'products', title: r.name || r.sku || `Item ${r._id}`, subtitle: r.sku, href: mapHref(app, 'products', r._id) }));
      rfqs.forEach((r: any) => hits.push({ id: String(r._id), entity: 'rfqs', title: r.title || `RFQ ${r._id}`, subtitle: r.status, href: mapHref(app, 'rfqs', r._id) }));
      orders.forEach((r: any) => hits.push({ id: String(r._id), entity: 'orders', title: r.orderNumber ? `Order ${r.orderNumber}` : `Order ${r._id}`, subtitle: r.status, href: mapHref(app, 'orders', r._id) }));
      vendors.forEach((r: any) => hits.push({ id: String(r._id), entity: 'vendors', title: r.name || `Vendor ${r._id}`, href: mapHref(app, 'vendors', r._id) }));
    } else {
      const [listings, projects, agents] = await Promise.all([
        allow('listings') ? db.collection('listings').find({ tenantId, $text: { $search: q } }).project({ title: 1, location: 1, price: 1 }).limit(10).toArray() : [],
        allow('projects') ? db.collection('projects').find({ tenantId, $text: { $search: q } }).project({ name: 1 }).limit(6).toArray() : [],
        allow('agents') ? db.collection('agents').find({ tenantId, $text: { $search: q } }).project({ name: 1, company: 1 }).limit(6).toArray() : [],
      ]);
      listings.forEach((r: any) => hits.push({ id: String(r._id), entity: 'listings', title: r.title || `Listing ${r._id}`, subtitle: r.location?.city || r.price, href: mapHref(app, 'listings', r._id) }));
      projects.forEach((r: any) => hits.push({ id: String(r._id), entity: 'projects', title: r.name || `Project ${r._id}`, href: mapHref(app, 'projects', r._id) }));
      agents.forEach((r: any) => hits.push({ id: String(r._id), entity: 'agents', title: r.name || `Agent ${r._id}`, subtitle: r.company, href: mapHref(app, 'agents', r._id) }));
    }
  } catch (e) {
    // On error, return empty (no placeholders)
  }

  return NextResponse.json(hits.slice(0, 25));
}

