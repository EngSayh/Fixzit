'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

interface VendorProduct {
  id: string;
  title: { en: string };
  sku: string;
  status: string;
  buy: { price: number; currency: string; uom: string };
}

interface VendorCatalogueManagerProps {
  categories: { slug: string; name: string }[];
  initialProducts: VendorProduct[];
}

export default function VendorCatalogueManager({ categories, initialProducts }: VendorCatalogueManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState({
    title: '',
    sku: '',
    categoryId: '',
    price: '',
    uom: 'ea'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auto = useAutoTranslator('marketplace.vendorCatalogue');
  const addError = auto('Unable to add product', 'errors.addProduct');
  const networkError = auto('Network error. Please try again.', 'errors.network');

  const addProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/marketplace/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: { en: form.title },
          sku: form.sku,
          slug: form.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          categoryId: form.categoryId,
          buy: { price: Number(form.price), currency: 'SAR', uom: form.uom }
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? addError);
        return;
      }

      const payload = await response.json();
      setProducts([payload.data, ...products]);
      setForm({ title: '', sku: '', categoryId: '', price: '', uom: 'ea' });
    } catch (fetchError) {
      logger.error('Failed to add product:', { error: fetchError });
      setError(networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          {auto('Vendor Catalogue', 'header.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {auto('Publish compliant products for Fixzit Souq buyers.', 'header.subtitle')}
        </p>
      </div>
      <div className="rounded-3xl bg-card p-6 shadow">
        <h2 className="text-lg font-semibold text-foreground">
          {auto('Add new product', 'form.title')}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-muted-foreground">
            {auto('Product title', 'form.fields.title')}
            <input
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm text-muted-foreground">
            {auto('SKU', 'form.fields.sku')}
            <input
              value={form.sku}
              onChange={event => setForm({ ...form, sku: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm text-muted-foreground">
            {auto('Category', 'form.fields.category')}
            <select
              value={form.categoryId}
              onChange={event => setForm({ ...form, categoryId: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            >
              <option value="">{auto('Select', 'form.selectPlaceholder')}</option>
              {categories.map(category => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted-foreground">
            {auto('Price (SAR)', 'form.fields.price')}
            <input
              type="number"
              value={form.price}
              onChange={event => setForm({ ...form, price: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm text-muted-foreground">
            {auto('Unit of measure', 'form.fields.uom')}
            <input
              value={form.uom}
              onChange={event => setForm({ ...form, uom: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button
          onClick={addProduct}
          disabled={loading}
          className="mt-4 rounded-full bg-warning px-5 py-2 text-sm font-semibold text-black hover:bg-warning/90 disabled:opacity-60"
        >
          {loading ? auto('Saving…', 'form.saving') : auto('Publish product', 'form.submit')}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {auto('Published products', 'list.title')}
        </h2>
        {products.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map(product => (
              <article key={product.id} className="rounded-3xl bg-card p-5 shadow">
                <h3 className="text-lg font-semibold text-foreground">{product.title.en}</h3>
                <p className="text-sm text-muted-foreground">
                  {auto('SKU {{value}}', 'list.sku').replace('{{value}}', product.sku)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {product.buy.price} {product.buy.currency} / {product.buy.uom}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {product.status}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-primary/40 bg-card p-10 text-center text-muted-foreground">
            <p className="text-lg font-semibold text-foreground">
              {auto('No products yet', 'empty.title')}
            </p>
            <p className="mt-2 text-sm">
              {auto('Add products to appear in the marketplace catalogue.', 'empty.subtitle')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
