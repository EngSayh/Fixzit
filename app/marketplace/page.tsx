// @ts-nocheck
import Link from 'next/link';
import { headers } from 'next/headers';

async function fetchProducts(q: string) {
  const h = headers();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const url = new URL(`/api/marketplace/search${q ? `?q=${encodeURIComponent(q)}` : ''}`, baseUrl);
  const cookie = h.get('cookie');
  const res = await fetch(url.toString(), { cache: 'no-store', headers: cookie ? { cookie } : undefined });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function MarketplacePage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q || '').trim();
  const data = await fetchProducts(q);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Fixzit Marketplace</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(data.items || []).map((p: any) => (
          <Link key={p._id || p.slug} href={`/marketplace/product/${p.slug}`} className="border rounded p-3 hover:shadow">
            <div className="aspect-square bg-gray-50 rounded mb-2"></div>
            <div className="text-sm line-clamp-2 mb-1">{p.title}</div>
            <div className="text-[13px] text-gray-500">⭐ {p?.rating?.avg ?? 0} · {p?.rating?.count ?? 0}</div>
            <div className="text-[12px] text-green-700">Lead {p?.inventories?.[0]?.leadDays ?? 3} days</div>
          </Link>
        ))}
      </div>
      {(data.items || []).length === 0 && (
        <div className="text-gray-600">No products yet. Seed the marketplace and refresh.</div>
      )}
    </div>
  );
}