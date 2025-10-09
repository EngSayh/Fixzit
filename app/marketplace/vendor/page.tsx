
import VendorCatalogueManager from '@/components/marketplace/VendorCatalogueManager';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>('/api/marketplace/vendor/products')
  ]);

  const _departments = (categoriesResponse.data as any[]).map((category: any) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const products = productsResponse.data as any[];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <VendorCatalogueManager categories={_departments} initialProducts={products} />
      </main>
    </div>
  );
}

