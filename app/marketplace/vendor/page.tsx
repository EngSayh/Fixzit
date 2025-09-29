import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import VendorCatalogueManager from '@/src/components/marketplace/VendorCatalogueManager';
import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/vendor/products')
  ]);

  const departments = (categoriesResponse.data as any[]).map((category: any) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const products = productsResponse.data as any[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <TopBarAmazon departments={departments} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <VendorCatalogueManager categories={departments} initialProducts={products} />
      </main>
    </div>
  );
}
