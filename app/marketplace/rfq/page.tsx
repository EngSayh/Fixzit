
import RFQBoard from '@/components/marketplace/RFQBoard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

export default async function RFQPage() {
  const [_categoriesResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/rfq')
  ]);

  const _categories = (_categoriesResponse.data as any[]).map((category: any) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const rfqs = rfqResponse.data as any[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RFQBoard categories={_categories} initialRfqs={rfqs} />
      </main>
    </div>
  );
}

