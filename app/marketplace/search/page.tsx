
import ProductCard from '@/components/marketplace/ProductCard';
import SearchFiltersPanel from '@/components/marketplace/SearchFiltersPanel';
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface Product {
  _id: string;
  slug: string;
  title: { en: string };
  media?: Array<{ url: string; alt?: string }>;
  buy: {
    price: number;
    currency: string;
    uom: string;
  };
  stock?: {
    onHand: number;
    reserved: number;
  };
}

interface CategoryFacet {
  slug: string;
  name: string;
}

interface SearchResponse {
  items?: Product[];
  facets?: { 
    categories?: CategoryFacet[]; 
    brands?: string[]; 
    standards?: string[] 
  };
  pagination?: { total?: number };
}

export default async function MarketplaceSearch(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const query = new URLSearchParams();
  for (const key of ['q', 'cat', 'brand', 'std', 'min', 'max', 'page']) {
    const value = searchParams[key];
    if (typeof value === 'string' && value.length) {
      query.set(key, value);
    }
  }

  const searchResponse = await serverFetchJsonWithTenant<{ data: SearchResponse }>(`/api/marketplace/search?${query.toString()}`);

  const searchData = searchResponse.data ?? {} as SearchResponse;

  const items = Array.isArray(searchData.items) ? searchData.items : [];
  const facetsData = searchData.facets ?? {};
  const pagination = searchData.pagination ?? { total: items.length };

  const facets = {
    categories: Array.isArray(facetsData.categories) ? facetsData.categories : [],
    brands: Array.isArray(facetsData.brands) ? facetsData.brands : [],
    standards: Array.isArray(facetsData.standards) ? facetsData.standards : []
  };

  const rawQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const queryLabel = rawQuery && rawQuery.trim().length > 0 ? rawQuery : 'All products';
  const totalResults = typeof pagination.total === 'number' ? pagination.total : items.length;
  const heading = `${totalResults} result(s) for ‘${queryLabel}’`;


  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <SearchFiltersPanel facets={facets} />
        <section className="flex-1 space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-[#0061A8]">Search results</p>
              <h1 className="text-2xl font-semibold text-[#0F1111]">{heading}</h1>
            </div>
            <Link
              href="/marketplace/rfq"
              className="rounded-full bg-[#0061A8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00558F]"
            >
              Start RFQ
            </Link>
          </header>

          {items.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product: Product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">
              <p className="text-lg font-semibold text-[#0F1111]">No items match your filters</p>
              <p className="mt-2 text-sm">Adjust filters or submit an RFQ for bespoke sourcing.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

