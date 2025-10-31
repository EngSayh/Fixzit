import Image from 'next/image';
import PDPBuyBox from '@/components/marketplace/PDPBuyBox';
import ProductCard from '@/components/marketplace/ProductCard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

interface Category {
  slug: string;
  name?: { en?: string };
}

interface MediaFile {
  url: string;
  role?: string;
}

interface Product {
  _id: string;
  slug: string;
  title: { en: string };
  summary?: string;
  sku: string;
  brand?: string;
  standards?: string[];
  specs?: Record<string, unknown>;
  media?: MediaFile[];
  related?: Product[];
  buy: {
    price: number;
    currency: string;
    uom: string;
    leadDays?: number;
    minQty?: number;
  };
  stock?: {
    onHand: number;
    reserved: number;
    location?: string;
  };
}

export default async function ProductDetail(props: ProductPageProps) {
  const params = await props.params;
  const [categoriesResponse, productResponse] = await Promise.all([
    serverFetchJsonWithTenant<{ data: Category[] }>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<{ data: { product: Product; category?: Category } }>(`/api/marketplace/products/${params.slug}`)
  ]);

  const _departments = (categoriesResponse.data as Category[]).map(category => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const product = productResponse.data.product;
  const category = productResponse.data.category;

  const attachments = product.media?.filter((file: MediaFile) => file.role === 'MSDS' || file.role === 'COA') ?? [];
  const gallery = product.media?.filter((file: MediaFile) => file.role === 'GALLERY') ?? [];

  const FIXZIT_COLORS = { primary: '#0061A8', success: '#00A859', warning: '#FFB400' } as const;
  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col" style={{ direction: 'ltr' }}>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="text-sm text-[#0061A8]">
          <a href="/marketplace" className="hover:underline">
            Marketplace
          </a>
          <span className="mx-2 text-muted-foreground">/</span>
          {category && (
            <a href={`/marketplace/search?cat=${category.slug}`} className="hover:underline">
              {category.name?.en ?? category.slug}
            </a>
          )}
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground" style={{ color: FIXZIT_COLORS.primary }}>{product.title.en}</span>
        </nav>

        <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-lg">
              <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-muted h-96">
                    <Image
                      src={gallery[0]?.url || '/images/marketplace/placeholder-product.svg'}
                      alt={product.title.en}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {gallery.map((image: MediaFile) => (
                      <div key={image.url} className="relative h-16 w-16 rounded-2xl border border-border overflow-hidden">
                        <Image
                          src={image.url}
                          alt={product.title.en}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl font-semibold text-[#0F1111]">{product.title.en}</h1>
                  {product.summary && <p className="text-sm text-muted-foreground">{product.summary}</p>}
                  <div className="space-y-2 text-sm text-foreground">
                    <p><span className="font-semibold">SKU:</span> {product.sku}</p>
                    {product.brand && <p><span className="font-semibold">Brand:</span> {product.brand}</p>}
                    {product.standards?.length ? (
                      <p>
                        <span className="font-semibold">Standards:</span> {product.standards.join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl bg-[#F8FBFF] p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0061A8]">Key specifications</h2>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {Object.entries(product.specs || {}).map(([key, value]) => (
                        <li key={key} className="flex justify-between gap-4">
                          <span className="font-medium capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                          <span>{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {attachments.length > 0 && (
                    <div className="rounded-2xl border border-[#0061A8]/30 bg-card p-4">
                      <h3 className="text-sm font-semibold text-[#0061A8]">Compliance documents</h3>
                      <ul className="mt-2 space-y-2 text-sm text-[#0F1111]">
                        {attachments.map((file: MediaFile) => (
                          <li key={file.url}>
                            <a href={file.url} className="hover:underline" target="_blank">
                              {file.role === 'MSDS' ? 'Material Safety Data Sheet' : 'Certificate of Analysis'}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="rounded-2xl bg-card p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-[#0F1111]">Related items</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {product.related?.length ? (
                  product.related.map((related: Product) => <ProductCard key={related._id} product={related} />)
                ) : (
                  <p className="text-sm text-muted-foreground">Additional items will appear as catalogue grows.</p>
                )}
              </div>
            </section>
          </div>

          <PDPBuyBox product={product} />
        </section>
      </main>
    </div>
  );
}
