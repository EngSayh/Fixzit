import React from 'react';
import { logger } from '@/lib/logger';
import ProductCard from '@/components/marketplace/ProductCard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface Category {
  id: string;
  slug: string;
  name?: { en: string };
}

interface Product {
  id: string;
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
  try {
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
  } catch (error) {
    logger.error('Failed to load marketplace homepage data', { error });
    // Return empty data to allow graceful degradation
    return { categories: [], featured: [], carousels: [] };
  }
}

export default async function MarketplaceHome() {
  const { featured, carousels } = await loadHomepageData();

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      
      <main className="mx-auto max-w-7xl px-4 py-8 flex-1">
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-success to-primary p-10 text-white shadow-xl">
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
          <div className="flex flex-col gap-3 rounded-3xl border border-primary/20 bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Live Operational KPIs</h2>
            <div className="grid gap-3 text-sm text-foreground">
              <div className="rounded-2xl bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wider text-primary">Open approvals</p>
                <p className="text-2xl font-bold text-primary">3</p>
              </div>
              <div className="rounded-2xl bg-warning/10 p-4">
                <p className="text-xs uppercase tracking-wider text-warning">Pending deliveries</p>
                <p className="text-2xl font-bold text-warning">7</p>
              </div>
              <div className="rounded-2xl bg-success/10 p-4">
                <p className="text-xs uppercase tracking-wider text-success">Finance ready</p>
                <p className="text-2xl font-bold text-success">5</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary">Featured for your organisation</h2>
            <a href="/marketplace/search" className="text-sm font-semibold text-primary hover:underline">
              View all
            </a>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {carousels.map(carousel => (
          <section key={carousel.category.slug} className="mt-12 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">{carousel.category.name?.en ?? carousel.category.slug}</h3>
              <a
                href={`/marketplace/search?cat=${carousel.category.slug}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Explore all
              </a>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {carousel.items.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

