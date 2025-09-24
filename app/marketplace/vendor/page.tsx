import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import VendorCatalogueManager from '@/src/components/marketplace/VendorCatalogueManager';
import { cookies } from 'next/headers';

async function fetchWithTenant(path: string) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('fixzit_auth');
  const res = await fetch(path, {
    cache: 'no-store',
    headers: authCookie ? { Cookie: `fixzit_auth=${authCookie.value}` } : undefined
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    fetchWithTenant('/api/marketplace/categories'),
    fetchWithTenant('/api/marketplace/vendor/products')
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
