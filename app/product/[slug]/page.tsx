// @ts-nocheck
import Link from 'next/link';

import { headers } from 'next/headers';
async function fetchPdp(slug: string) {
  const h = headers();
  const cookie = h.get('cookie');
  const res = await fetch(`/api/marketplace/products/${slug}`, {
    cache: 'no-store',
    headers: cookie ? { cookie } : undefined,
    credentials: 'include'
  } as any);
  return res.json();
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await fetchPdp(params.slug);
  const p = data?.data?.product || data?.product;
  const bb = p
    ? {
        price: p?.buy?.price ?? null,
        currency: p?.buy?.currency ?? 'SAR',
        inStock: (p?.stock?.onHand ?? 0) > 0,
        leadDays: p?.buy?.leadDays ?? 3
      }
    : null;

  if (!p) {
    return <div className="p-6">Not found</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-6">
        <div className="aspect-square bg-gray-50 rounded overflow-hidden" />
      </div>
      <div className="col-span-12 md:col-span-6 space-y-4">
        <h1 className="text-2xl font-semibold">{p?.title?.en ?? p?.title}</h1>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          {[
            { key: 'Brand', value: p?.brand },
            { key: 'Standards', value: Array.isArray(p?.standards) ? p?.standards.join(', ') : undefined },
            { key: 'UOM', value: p?.buy?.uom },
            { key: 'Min Qty', value: p?.buy?.minQty }
          ]
            .filter((a: any) => a?.value !== undefined && a?.value !== null && String(a.value).trim() !== '')
            .slice(0, 6)
            .map((a: any, i: number) => (
              <li key={i}><b>{a.key}:</b> {String(a.value)}</li>
            ))}
        </ul>
        <div className="border rounded p-4">
          <div className="text-2xl font-bold">{bb?.price?.toLocaleString()} {bb?.currency}</div>
          <div className="text-sm text-gray-600">{bb?.inStock ? 'In Stock' : 'Backorder'} · Lead {bb?.leadDays} days</div>
          <div className="flex gap-2 mt-3">
            <Link href="/cart" className="px-4 py-2 bg-[#febd69] text-black rounded hover:opacity-90">Add to Cart</Link>
            <Link href="/orders/new?mode=buy-now" className="px-4 py-2 bg-[#ffd814] text-black rounded hover:opacity-90">Buy Now (PO)</Link>
          </div>
        </div>
      </div>
      <section className="col-span-12">
        <h3 className="text-lg font-semibold mb-2">About this item</h3>
        <p className="text-sm text-gray-700">Technical data sheets (MSDS/COA), installation notes, and compliance info.</p>
      </section>
    </div>
  );
}