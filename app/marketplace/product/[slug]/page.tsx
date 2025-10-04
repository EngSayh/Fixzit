import Image from 'next/image';
import PDPBuyBox from '@/components/marketplace/PDPBuyBox';
import ProductCard from '@/components/marketplace/ProductCard';
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProductData(slug: string) {
  try {
    const [categoriesResponse, productResponse] = await Promise.all([
      serverFetchJsonWithTenant<any>('/api/marketplace/categories').catch(err => {
        console.error('Failed to fetch categories for product detail:', err);
        return { data: [] };
      }),
      serverFetchJsonWithTenant<any>(`/api/marketplace/products/${slug}`).catch(err => {
        console.error(`Failed to fetch product ${slug}:`, err);
        return { data: { product: null, category: null } };
      })
    ]);

    const departments = ((categoriesResponse.data || []) as any[]).map(category => ({
      slug: category.slug,
      name: category.name?.en ?? category.slug
    }));

    const product = productResponse.data?.product || null;
    const category = productResponse.data?.category || null;

    return { departments, product, category };
  } catch (error) {
    console.error('Failed to load product detail page data:', error);
    return { departments: [], product: null, category: null };
  }
}

export default async function ProductDetail(props: ProductPageProps) {
  const params = await props.params;
  const { departments, product, category } = await loadProductData(params.slug);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#0F1111]">Product not found</h1>
          <p className="mt-2 text-gray-600">The product you're looking for doesn't exist or has been removed.</p>
          <a href="/marketplace" className="mt-4 inline-block text-[#0061A8] hover:underline">
            Return to Marketplace
          </a>
        </div>
      </div>
    );
  }

  const attachments = product.media?.filter((file: any) => file.role === 'MSDS' || file.role === 'COA') ?? [];
  const gallery = product.media?.filter((file: any) => file.role === 'GALLERY') ?? [];

  const FIXZIT_COLORS = { primary: '#0061A8', success: '#00A859', warning: '#FFB400' } as const;
  return (
    <div className="min-h-screen bg-[#F5F6F8]" style={{ direction: 'ltr' }}>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="text-sm text-[#0061A8]">
          <a href="/marketplace" className="hover:underline">
            Marketplace
          </a>
          <span className="mx-2 text-gray-400">/</span>
          {category && (
            <a href={`/marketplace/search?cat=${category.slug}`} className="hover:underline">
              {category.name?.en ?? category.slug}
            </a>
          )}
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600" style={{ color: FIXZIT_COLORS.primary }}>{product.title?.en ?? 'Product'}</span>
        </nav>

        <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-gray-100 h-96">
                    {gallery.length > 0 ? (
                      <Image
                        src={gallery[0].url}
                        alt={product.title?.en ?? 'Product image'}
                        fill
                        sizes="(max-width: 768px) 100vw, 60vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No image available
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-[#0F1111]">{product.title?.en ?? 'Product'}</h1>
                  {product.rating && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-[#FFB400]">★★★★★</span>
                      <span className="text-gray-600">
                        {product.rating.avg} ({product.rating.count} reviews)
                      </span>
                    </div>
                  )}

                  {product.description?.en && (
                    <p className="mt-4 text-gray-700">{product.description.en}</p>
                  )}

                  {attachments.length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-sm font-semibold text-[#0F1111]">Documents</h2>
                      <ul className="mt-2 space-y-1 text-sm">
                        {attachments.map((file: any, idx: number) => (
                          <li key={idx}>
                            <a href={file.url} className="text-[#0061A8] hover:underline" target="_blank" rel="noopener noreferrer">
                              {file.role} - {file.filename || 'Download'}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PDPBuyBox product={product} />
        </section>
      </main>
    </div>
  );
}

