import TopBarAmazon from &apos;@/src/components/marketplace/TopBarAmazon&apos;;
import RFQBoard from &apos;@/src/components/marketplace/RFQBoard&apos;;
import { serverFetchJsonWithTenant } from &apos;@/src/lib/marketplace/serverFetch&apos;;

export default async function RFQPage() {
  const [categoriesResponse, rfqResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/categories&apos;),
    serverFetchJsonWithTenant<any>(&apos;/api/marketplace/rfq&apos;)
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
