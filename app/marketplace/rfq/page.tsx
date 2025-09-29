import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import RFQBoard from '@/src/components/marketplace/RFQBoard';
import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';

export default async function RFQPage() {
  const [categoriesResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/rfq')
  ]);

  const departments = (categoriesResponse.data as any[]).map((category: any) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const categories = departments;
  const rfqs = rfqResponse.data as any[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <TopBarAmazon departments={departments} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RFQBoard categories={categories} initialRfqs={rfqs} />
      </main>
    </div>
  );
}
