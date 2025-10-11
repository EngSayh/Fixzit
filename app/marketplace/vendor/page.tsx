
import VendorCatalogueManager from '@/components/marketplace/VendorCatalogueManager';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface Category {
  slug: string;
  name?: { en?: string };
}

interface Product {
  _id: string;
  title: { en: string; };
  sku: string;
  status: string;
  buy: { price: number; currency: string; uom: string; };
  [key: string]: unknown;
}

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    serverFetchJsonWithTenant<{ data: Category[] }>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<{ data: Product[] }>('/api/marketplace/vendor/products')
  ]);

  const _departments = categoriesResponse.data.map((category) => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const products = productsResponse.data;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <VendorCatalogueManager categories={_departments} initialProducts={products} />
      </main>
    </div>
  );
}

