'use client';

import { useState } from 'react';

interface VendorProduct {
  _id: string;
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

  const addProduct = async () => {
    setLoading(true);
    setError(null);
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
    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Unable to add product');
      return;
    }

    const payload = await response.json();
    setProducts([payload.data, ...products]);
    setForm({ title: '', sku: '', categoryId: '', price: '', uom: 'ea' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[#0F1111]">Vendor Catalogue</h1>
        <p className="text-sm text-gray-600">Publish compliant products for Fixzit Souq buyers.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-[#0F1111]">Add new product</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-600">
            Product title
            <input
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            SKU
            <input
              value={form.sku}
              onChange={event => setForm({ ...form, sku: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Category
            <select
              value={form.categoryId}
              onChange={event => setForm({ ...form, categoryId: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="">Select</option>
              {categories.map(category => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Price (SAR)
            <input
              type="number"
              value={form.price}
              onChange={event => setForm({ ...form, price: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Unit of measure
            <input
              value={form.uom}
              onChange={event => setForm({ ...form, uom: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={addProduct}
          disabled={loading}
          className="mt-4 rounded-full bg-[#FFB400] px-5 py-2 text-sm font-semibold text-black hover:bg-[#FFCB4F] disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Publish product'}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0F1111]">Published products</h2>
        {products.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map(product => (
              <article key={product._id} className="rounded-3xl bg-white p-5 shadow">
                <h3 className="text-lg font-semibold text-[#0F1111]">{product.title.en}</h3>
                <p className="text-sm text-gray-600">SKU {product.sku}</p>
                <p className="text-sm text-gray-600">
                  {product.buy.price} {product.buy.currency} / {product.buy.uom}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-[#0061A8]/10 px-3 py-1 text-xs font-semibold text-[#0061A8]">
                  {product.status}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">
            <p className="text-lg font-semibold text-[#0F1111]">No products yet</p>
            <p className="mt-2 text-sm">Add products to appear in the marketplace catalogue.</p>
          </div>
        )}
      </section>
    </div>
  );
}
