
import VendorCatalogueManager from '@/components/marketplace/VendorCatalogueManager';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/vendor/products')
  ]);

  const departments = (categoriesResponse.data as unknown[]).map((category: unknown) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const products = productsResponse.data as unknown[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <VendorCatalogueManager categories={departments} initialProducts={products} />
      </main>
    </div>
  );
}

