'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { logger } from '@/lib/logger';

interface Product {
  title?: string | { en?: string };
  brand?: string;
  standards?: string[];
  buy?: {
    price?: number;
    currency?: string;
    leadDays?: number;
    uom?: string;
    minQty?: number;
  };
  stock?: {
    onHand?: number;
    reserved?: number;
  };
  [key: string]: unknown;
}

interface ApiResponse {
  data?: {
    product?: Product;
  };
  product?: Product;
  [key: string]: unknown;
}

async function fetchPdp(slug: string) {
  try {
    const res = await fetch(`/api/marketplace/products/${slug}`, {
      cache: 'no-store',
      credentials: 'include'
    } as RequestInit);
    return res.json();
  } catch (error) {
    logger.error('Product PDP fetch error:', { error });
    throw error;
  }
}

export default function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation();
  const params = use(props.params); // Use React 19's use() hook to unwrap the Promise
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPdp(params.slug)
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(error => {
        logger.error('Failed to load product', { error, slug: params.slug });
        setLoading(false);
      });
  }, [params.slug]);
  if (loading || !data) {
    return <div className="p-6">{t('common.loading', 'Loading...')}</div>;
  }

  const p = data?.data?.product || data?.product;
  const bb = p
    ? {
        price: p?.buy?.price ?? null,
        currency: p?.buy?.currency ?? 'SAR',
        inStock: ((p?.stock?.onHand ?? 0) - (p?.stock?.reserved ?? 0)) > 0,
        leadDays: p?.buy?.leadDays ?? 3
      }
    : null;

  if (!p) {
    return <div className="p-6">{t('product.notFound', 'Not found')}</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-6">
        <div className="aspect-square bg-muted rounded overflow-hidden" />
      </div>
      <div className="col-span-12 md:col-span-6 space-y-4">
        <h1 className="text-2xl font-semibold">
          {typeof p?.title === 'object' && p.title?.en ? p.title.en : (typeof p?.title === 'string' ? p.title : '')}
        </h1>
        <ul className="list-disc ps-5 text-sm text-foreground">
          {[
            { key: t('product.brand', 'Brand'), value: p?.brand },
            { key: t('product.standards', 'Standards'), value: Array.isArray(p?.standards) ? p?.standards.join(', ') : undefined },
            { key: t('product.uom', 'UOM'), value: p?.buy?.uom },
            { key: t('product.minQty', 'Min Qty'), value: p?.buy?.minQty }
          ]
            .filter((a) => a?.value !== undefined && a?.value !== null && String(a.value).trim() !== '')
            .slice(0, 6)
            .map((a) => (
              <li key={a.key}><b>{a.key}:</b> {String(a.value)}</li>
            ))}
        </ul>
        <div className="border rounded p-4">
          <div className="text-2xl font-bold">{bb?.price?.toLocaleString()} {bb?.currency}</div>
          <div className="text-sm text-muted-foreground">
            {bb?.inStock ? t('product.inStock', 'In Stock') : t('product.backorder', 'Backorder')} · {t('product.lead', 'Lead')} {bb?.leadDays} {t('product.days', 'days')}
          </div>
          <div className="flex gap-2 mt-3">
            <Link href="/cart" className="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
              {t('product.addToCart', 'Add to Cart')}
            </Link>
            <Link href="/orders/new?mode=buy-now" className="px-4 py-2 bg-warning text-black rounded hover:opacity-90">
              {t('product.buyNow', 'Buy Now (PO)')}
            </Link>
          </div>
        </div>
      </div>
      <section className="col-span-12">
        <h3 className="text-lg font-semibold mb-2">{t('product.aboutTitle', 'About this item')}</h3>
        <p className="text-sm text-foreground">{t('product.aboutDesc', 'Technical data sheets (MSDS/COA), installation notes, and compliance info.')}</p>
      </section>
    </div>
  );
}