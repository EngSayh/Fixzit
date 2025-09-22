import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Mock data for help articles
const mockArticles = [
  {
    slug: 'getting-started',
    title: 'Getting Started with Fixzit Enterprise',
    category: 'General',
    updatedAt: new Date('2025-01-15T10:00:00Z').toISOString()
  },
  {
    slug: 'work-orders-overview',
    title: 'Work Orders Overview',
    category: 'Facility Management',
    updatedAt: new Date('2025-01-14T14:30:00Z').toISOString()
  },
  {
    slug: 'vendor-management',
    title: 'Managing Vendors and Suppliers',
    category: 'Procurement',
    updatedAt: new Date('2025-01-13T16:45:00Z').toISOString()
  },
  {
    slug: 'tenant-relations',
    title: 'Tenant Relations and Communication',
    category: 'Customer Service',
    updatedAt: new Date('2025-01-12T09:15:00Z').toISOString()
  },
  {
    slug: 'financial-reporting',
    title: 'Financial Reporting and Invoicing',
    category: 'Finance',
    updatedAt: new Date('2025-01-11T11:20:00Z').toISOString()
  },
  {
    slug: 'property-maintenance',
    title: 'Property Maintenance Best Practices',
    category: 'Facility Management',
    updatedAt: new Date('2025-01-10T08:30:00Z').toISOString()
  },
  {
    slug: 'rfq-process',
    title: 'Request for Quote (RFQ) Process',
    category: 'Procurement',
    updatedAt: new Date('2025-01-09T15:10:00Z').toISOString()
  },
  {
    slug: 'compliance-requirements',
    title: 'Compliance and Regulatory Requirements',
    category: 'Legal',
    updatedAt: new Date('2025-01-08T13:45:00Z').toISOString()
  }
];

export async function GET(req: NextRequest){
  try {
    const sp = new URL(req.url).searchParams;
    const category = sp.get("category") || undefined;

    // Filter articles by category if specified
    let filteredArticles = mockArticles;
    if (category) {
      filteredArticles = mockArticles.filter(article =>
        article.category.toLowerCase() === category.toLowerCase()
      );
    }

    return NextResponse.json({ items: filteredArticles });
  } catch (error) {
    console.error('Error fetching help articles:', error);

    // Always return mock data as fallback
    return NextResponse.json({ items: mockArticles });
  }
}
