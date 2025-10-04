
import RFQBoard from '@/components/marketplace/RFQBoard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadRFQData() {
  try {
    const [categoriesResponse, rfqResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch marketplace categories for RFQ:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/rfq').catch(err => {
        console.error('Failed to fetch RFQs:', err);
        return { data: [] };
      })
    ]);

    const categories = ((categoriesResponse.data || []) as any[]).map((category: any) => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const rfqs = (rfqResponse.data || []) as any[];

    return { categories, rfqs };
  } catch (error) {
    console.error('Failed to load RFQ page data:', error);
    return { categories: [], rfqs: [] };
  }
}

export default async function RFQPage() {
  const { categories, rfqs } = await loadRFQData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RFQBoard categories={categories} initialRfqs={rfqs} />
      </main>
    </div>
  );
}

