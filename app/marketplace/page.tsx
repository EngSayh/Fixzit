
import ProductCard from '@/components/marketplace/ProductCard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface Category {
  _id: string;
  slug: string;
  name?: { en: string };
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

async function loadHomepageData() {
  const [categoriesResponse, featuredResponse] = await Promise.all([
    serverFetchJsonWithTenant<{ data: Category[] }>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<{ data: { items: Product[] } }>('/api/marketplace/products?limit=8')
  ]);

  const categories = categoriesResponse.data;
  const featured = featuredResponse.data.items;

  const carousels = await Promise.all(
    categories.slice(0, 4).map(async category => {
      const response = await serverFetchJsonWithTenant<{ data: { items: Product[] } }>(`/api/marketplace/search?cat=${category.slug}&limit=6`);
      return {
        category,
        items: response.data.items
      };
    })
  );

  return { categories, featured, carousels };
}

export default async function MarketplaceHome() {
  const { categories: _categories, featured, carousels } = await loadHomepageData();
  const FIXZIT_COLORS = { primary: '#0061A8', success: '#00A859', warning: '#FFB400' } as const;

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      
      <main className="mx-auto max-w-7xl px-4 py-8 flex-1">
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0061A8] via-[#00A859] to-[#0061A8] p-10 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Fixzit Souq</p>
            <h1 className="mt-4 text-4xl font-bold">Facilities, MRO & Construction Marketplace</h1>
            <p className="mt-3 max-w-xl text-lg text-white/80">
              Source ASTM and BS EN compliant materials with tenant-level approvals, finance posting, and vendor SLAs baked in.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold">
              <span className="rounded-full bg-white/20 px-4 py-2">Rapid RFQ</span>
              <span className="rounded-full bg-white/20 px-4 py-2">Work Order linked orders</span>
              <span className="rounded-full bg-white/20 px-4 py-2">Finance ready invoices</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-[#0061A8]/20 bg-white/90 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#0F1111]">Live Operational KPIs</h2>
            <div className="grid gap-3 text-sm text-foreground">
              <div className="rounded-2xl bg-[#0061A8]/10 p-4">
                <p className="text-xs uppercase tracking-wider text-[#0061A8]">Open approvals</p>
                <p className="text-2xl font-bold text-[#0061A8]">3</p>
              </div>
              <div className="rounded-2xl bg-[#FFB400]/10 p-4">
                <p className="text-xs uppercase tracking-wider text-[#FF9800]">Pending deliveries</p>
                <p className="text-2xl font-bold text-[#FF9800]">7</p>
              </div>
              <div className="rounded-2xl bg-[#00A859]/10 p-4">
                <p className="text-xs uppercase tracking-wider text-[#00A859]">Finance ready</p>
                <p className="text-2xl font-bold text-[#00A859]">5</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: FIXZIT_COLORS.primary }}>Featured for your organisation</h2>
            <a href="/marketplace/search" className="text-sm font-semibold text-[#0061A8] hover:underline">
              View all
            </a>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featured.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>

        {carousels.map(carousel => (
          <section key={carousel.category.slug} className="mt-12 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#0F1111]">{carousel.category.name?.en ?? carousel.category.slug}</h3>
              <a
                href={`/marketplace/search?cat=${carousel.category.slug}`}
                className="text-sm font-semibold hover:underline"
                style={{ color: FIXZIT_COLORS.primary }}
              >
                Explore all
              </a>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {carousel.items.map((product: Product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

