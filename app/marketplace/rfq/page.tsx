
import RFQBoard from '@/components/marketplace/RFQBoard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface Category {
  slug: string;
  name?: { en?: string };
}

interface RFQ {
  _id: string;
  title: string;
  currency: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export default async function RFQPage() {
  const [_categoriesResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<{ data: Category[] }>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<{ data: RFQ[] }>('/api/marketplace/rfq')
  ]);

  const _categories = _categoriesResponse.data.map((category) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const rfqs = rfqResponse.data;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RFQBoard categories={_categories} initialRfqs={rfqs} />
      </main>
    </div>
  );
}

