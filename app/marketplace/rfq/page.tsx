
import RFQBoard from '@/components/marketplace/RFQBoard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

export default async function RFQPage() {
  const [categoriesResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/rfq')
  ]);

  const departments = (categoriesResponse.data as unknown[]).map((category: unknown) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const categories = departments;
  const rfqs = rfqResponse.data as unknown[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RFQBoard categories={categories} initialRfqs={rfqs} />
      </main>
    </div>
  );
}

