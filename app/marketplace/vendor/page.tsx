
import VendorCatalogueManager from '@/components/marketplace/VendorCatalogueManager';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

async function loadVendorData() {
  try {
    const [categoriesResponse, productsResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for vendor portal:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>('/api/marketplace/vendor/products').catch(err => {
        console.error('Failed to fetch vendor products:', err);
        return { data: [] };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map((category: any) => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const products = (productsResponse.data || []) as any[];

    return { departments, products };
  } catch (error) {
    console.error('Failed to load vendor portal data:', error);
    return { departments: [], products: [] };
  }
}

export default async function VendorPortalPage() {
  const { departments, products } = await loadVendorData();

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <VendorCatalogueManager categories={departments} initialProducts={products} />
      </main>
    </div>
  );
}

