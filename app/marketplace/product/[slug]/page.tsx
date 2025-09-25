// @ts-nocheck
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

async function fetchPdp(slug: string) {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const base = `${proto}://${host}`;
  const res = await fetch(`${base}/api/marketplace/products/${slug}`, { cache: 'no-store', headers: { cookie: h.get('cookie') || '' } });
  return res.json();
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await fetchPdp(params.slug);
  const p = data?.product;
  const bb = data?.buyBox;

  if (!p) return notFound();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-6">
        <div className="aspect-square bg-gray-50 rounded overflow-hidden" />
      </div>
      <div className="col-span-12 md:col-span-6 space-y-4">
        <h1 className="text-2xl font-semibold">{p.title}</h1>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          {(p.attributes||[]).slice(0,6).map((a:any,i:number)=>(<li key={i}><b>{a.key}:</b> {a.value}</li>))}
        </ul>
        <div className="border rounded p-4">
          <div className="text-2xl font-bold">{bb?.price?.toLocaleString()} {bb?.currency}</div>
          <div className="text-sm text-gray-600">{bb?.inStock ? 'In Stock' : 'Backorder'} · Lead {bb?.leadDays} days</div>
          <div className="flex gap-2 mt-3">
            <Link href="/cart" className="px-4 py-2 bg-[#FFB400] text-black rounded hover:opacity-90">Add to Cart</Link>
            <Link href="/orders/new?mode=buy-now" className="px-4 py-2 bg-[#00A859] text-white rounded hover:opacity-90">Buy Now (PO)</Link>
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

