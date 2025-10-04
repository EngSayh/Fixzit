
import ProductCard from '@/components/marketplace/ProductCard';
import SearchFiltersPanel from '@/components/marketplace/SearchFiltersPanel';
import Link from 'next/link';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadSearchData(searchParams: Record<string, string | string[] | undefined>) {
  try {
    const query = new URLSearchParams();
    for (const key of ['q', 'cat', 'brand', 'std', 'min', 'max', 'page']) {
      const value = searchParams[key];
      if (typeof value === 'string' && value.length) {
        query.set(key, value);
      }
    }

    const [categoriesResponse, searchResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for search:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>(`/api/marketplace/search?${query.toString()}`).catch(err => {
        console.error('Failed to fetch search results:', err);
        return { data: { items: [], facets: {}, pagination: { total: 0 } } };
      })
    ]);

    const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
    const searchData = (searchResponse.data ?? {}) as {
      items?: any[];
      facets?: { categories?: any[]; brands?: any[]; standards?: any[] };
      pagination?: { total?: number };
    };

    const items = Array.isArray(searchData.items) ? searchData.items : [];
    const facetsData = searchData.facets ?? {};
    const pagination = searchData.pagination ?? { total: items.length };

    const facets = {
      categories: Array.isArray(facetsData.categories) ? facetsData.categories : [],
      brands: Array.isArray(facetsData.brands) ? facetsData.brands : [],
      standards: Array.isArray(facetsData.standards) ? facetsData.standards : []
    };

    const departments = categories.map((category: any) => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    return { items, facets, departments, pagination };
  } catch (error) {
    console.error('Failed to load marketplace search data:', error);
    return {
      items: [],
      facets: { categories: [], brands: [], standards: [] },
      departments: [],
      pagination: { total: 0 }
    };
  }
}

export default async function MarketplaceSearch(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const { items, facets, departments, pagination } = await loadSearchData(searchParams);

  const rawQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const queryLabel = rawQuery && rawQuery.trim().length > 0 ? rawQuery : 'All products';
  const totalResults = typeof pagination.total === 'number' ? pagination.total : items.length;
  const heading = `${totalResults} result(s) for '${queryLabel}'`;

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
              {items.map((product: any) => (
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

