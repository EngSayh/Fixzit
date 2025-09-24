import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const app = (url.searchParams.get('app') ?? 'fm') as 'fm'|'souq'|'aqar';
    const q = (url.searchParams.get('q') ?? '').trim();
    const entities = (url.searchParams.get('entities') ?? '').split(',').filter(Boolean);

    if (!q) return NextResponse.json([]);

    let results: any[] = [];

    // Mock data for now - replace with real MongoDB queries
    switch (app) {
      case 'fm': {
        results = [
          { id: 'wo-123', entity: 'work_orders', title: `Work Order: ${q}`, subtitle: 'P2 • Assessment', href: '/work-orders/123' },
          { id: 'prop-456', entity: 'properties', title: `Property: ${q} Towers`, subtitle: 'Riyadh • 120 Units', href: '/properties/456' },
          { id: 'tenant-789', entity: 'tenants', title: `Tenant: ${q} Company`, subtitle: 'Corporate • Active', href: '/tenants/789' },
        ];
        break;
      }
      case 'souq': {
        results = [
          { id: 'prod-101', entity: 'products', title: `Product: ${q} Filter`, subtitle: 'HVAC • MERV 11', href: '/marketplace/products/101' },
          { id: 'rfq-202', entity: 'rfqs', title: `RFQ: ${q} Request`, subtitle: 'Open • 3 Bids', href: '/marketplace/rfqs/202' },
          { id: 'vendor-303', entity: 'vendors', title: `Vendor: ${q} Services`, subtitle: 'Verified • 4.8★', href: '/marketplace/vendors/303' },
        ];
        break;
      }
      case 'aqar': {
        results = [
          { id: 'listing-401', entity: 'listings', title: `Listing: ${q} Residence`, subtitle: '2BR • North Ring • SAR 85k/yr', href: '/aqar/listings/401' },
          { id: 'project-502', entity: 'projects', title: `Project: ${q} Development`, subtitle: 'Under Construction • 2025', href: '/aqar/projects/502' },
          { id: 'agent-603', entity: 'agents', title: `Agent: ${q} Realty`, subtitle: 'Licensed • 15+ Years', href: '/aqar/agents/603' },
        ];
        break;
      }
    }

    // Filter by entities if specified
    if (entities.length > 0) {
      results = results.filter(r => entities.includes(r.entity));
    }

    return NextResponse.json(results.slice(0, 10));
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json([]);
  }
}