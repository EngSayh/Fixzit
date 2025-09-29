import TopBarAmazon from &apos;@/src/components/marketplace/TopBarAmazon&apos;;
import VendorCatalogueManager from &apos;@/src/components/marketplace/VendorCatalogueManager&apos;;
import { serverFetchJsonWithTenant } from &apos;@/src/lib/marketplace/serverFetch&apos;;

export default async function VendorPortalPage() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/categories&apos;),
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/vendor/products&apos;)
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
