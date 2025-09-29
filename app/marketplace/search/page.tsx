import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';

import ProductCard from '@/src/components/marketplace/ProductCard';import ProductCard from '@/src/components/marketplace/ProductCard';

import SearchFiltersPanel from '@/src/components/marketplace/SearchFiltersPanel';import SearchFiltersPanel from '@/src/components/marketplace/SearchFiltersPanel';

import Link from 'next/link';import Link from 'next/link';

import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';



interface SearchPageProps {interface SearchPageProps {

  searchParams: Record<string, string | string[] | undefined>;  searchParams: Record<string, string | string[] | undefined>;

}}



export default async function MarketplaceSearch({ searchParams }: SearchPageProps) {export default async function MarketplaceSearch({ searchParams }: SearchPageProps) {

  const query = new URLSearchParams();  const query = new URLSearchParams();

  for (const key of ['q', 'cat', 'brand', 'std', 'min', 'max', 'page']) {  for (const key of ['q', 'cat', 'brand', 'std', 'min', 'max', 'page']) {

    const value = searchParams[key];    const value = searchParams[key];

    if (typeof value === 'string' && value.length) {    if (typeof value === 'string' && value.length) {

      query.set(key, value);      query.set(key, value);

    }    }

  }  }



  const [categoriesResponse, searchResponse] = await Promise.all([  const [categoriesResponse, searchResponse] = await Promise.all([

    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),

    serverFetchJsonWithTenant<any>(`/api/marketplace/search?${query.toString()}`)    serverFetchJsonWithTenant<any>(`/api/marketplace/search?${query.toString()}`)

  ]);  ]);



  const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];  const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];

  const searchData = (searchResponse.data ?? {}) as {  const searchData = (searchResponse.data ?? {}) as {

    items?: any[];    items?: any[];

    facets?: { categories?: any[]; brands?: any[]; standards?: any[] };    facets?: { categories?: any[]; brands?: any[]; standards?: any[] };

    pagination?: { total?: number };    pagination?: { total?: number };

  };  };



  const items = Array.isArray(searchData.items) ? searchData.items : [];  const items = Array.isArray(searchData.items) ? searchData.items : [];

  const facetsData = searchData.facets ?? {};  const facetsData = searchData.facets ?? {};

  const pagination = searchData.pagination ?? { total: items.length };  const pagination = searchData.pagination ?? { total: items.length };



  const facets = {  const facets = {

    categories: Array.isArray(facetsData.categories) ? facetsData.categories : [],    categories: Array.isArray(facetsData.categories) ? facetsData.categories : [],

    brands: Array.isArray(facetsData.brands) ? facetsData.brands : [],    brands: Array.isArray(facetsData.brands) ? facetsData.brands : [],

    standards: Array.isArray(facetsData.standards) ? facetsData.standards : []    standards: Array.isArray(facetsData.standards) ? facetsData.standards : []

  };  };



  const departments = categories.map((category: any) => ({  const departments = categories.map((category: any) => ({

    slug: category.slug,    slug: category.slug,

    name: category.name?.en ?? category.slug    name: category.name?.en ?? category.slug

  }));  }));



  const rawQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;  const rawQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const queryLabel = rawQuery && rawQuery.trim().length > 0 ? rawQuery : 'All products';  const queryLabel = rawQuery && rawQuery.trim().length > 0 ? rawQuery : 'All products';

  const totalResults = typeof pagination.total === 'number' ? pagination.total : items.length;  const totalResults = typeof pagination.total === 'number' ? pagination.total : items.length;

  const heading = `${totalResults} result(s) for '${queryLabel}'`;  const heading = `${totalResults} result(s) for ‘${queryLabel}’`;



  return (  const heading = `${searchData.pagination.total} result(s) for ‘${searchParams.q ?? 'All products'}’`;

    <div className="min-h-screen bg-[#F5F6F8]">

      <TopBarAmazon departments={departments} loadingDepartments={!categories.length} />  const heading = `${searchData.pagination.total} result(s) for ‘${searchParams.q ?? 'All products'}’`;

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">

        <SearchFiltersPanel facets={facets} />  return (

        <section className="flex-1 space-y-6">    <div className="min-h-screen bg-[#F5F6F8]">

          <header className="flex flex-wrap items-center justify-between gap-3">      <TopBarAmazon departments={departments} loadingDepartments={!categories.length} />

            <div>      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">

              <p className="text-sm uppercase tracking-wide text-[#0061A8]">Search results</p>        <SearchFiltersPanel facets={facets} />

              <h1 className="text-2xl font-semibold text-[#0F1111]">{heading}</h1>        <section className="flex-1 space-y-6">

            </div>          <header className="flex flex-wrap items-center justify-between gap-3">

            <Link            <div>

              href="/marketplace/rfq"              <p className="text-sm uppercase tracking-wide text-[#0061A8]">Search results</p>

              className="rounded-full bg-[#0061A8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00558F]"              <h1 className="text-2xl font-semibold text-[#0F1111]">{heading}</h1>

            >            </div>

              Start RFQ            <Link

            </Link>              href="/marketplace/rfq"

          </header>              className="rounded-full bg-[#0061A8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00558F]"

            >

          {items.length ? (              Start RFQ

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">            </Link>

              {items.map((product: any) => (          </header>

                <ProductCard key={product._id} product={product} />

              ))}          {items.length ? (

            </div>            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

          ) : (              {items.map((product: any) => (

            <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">                <ProductCard key={product._id} product={product} />

              <p className="text-lg font-semibold text-[#0F1111]">No items match your filters</p>              ))}

              <p className="mt-2 text-sm">Adjust filters or submit an RFQ for bespoke sourcing.</p>            </div>

            </div>          ) : (

          )}            <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">

        </section>              <p className="text-lg font-semibold text-[#0F1111]">No items match your filters</p>

      </main>              <p className="mt-2 text-sm">Adjust filters or submit an RFQ for bespoke sourcing.</p>

    </div>            </div>

  );          )}

}        </section>
      </main>
    </div>
  );
}
