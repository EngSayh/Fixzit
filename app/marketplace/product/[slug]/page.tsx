import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import PDPBuyBox from '@/src/components/marketplace/PDPBuyBox';
import ProductCard from '@/src/components/marketplace/ProductCard';
import { serverFetchJsonWithTenant } from '@/src/lib/marketplace/serverFetch';

interface ProductPageProps {
  params: { slug: string };
}

export default async function ProductDetail({ params }: ProductPageProps) {
  const [categoriesResponse, productResponse] = await Promise.all([
    serverFetchJsonWithTenant<any>('/api/marketplace/categories'),
    serverFetchJsonWithTenant<any>(`/api/marketplace/products/${params.slug}`)
  ]);

  const departments = (categoriesResponse.data as any[]).map(category => ({
    slug: category.slug,
    name: category.name?.en ?? category.slug
  }));

  const product = productResponse.data.product;
  const category = productResponse.data.category;

  const attachments = product.media?.filter((file: any) => file.role === 'MSDS' || file.role === 'COA') ?? [];
  const gallery = product.media?.filter((file: any) => file.role === 'GALLERY') ?? [];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <TopBarAmazon departments={departments} />
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
          <span className="text-gray-600">{product.title.en}</span>
        </nav>

        <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl bg-gray-100">
                    <img
                      src={gallery[0]?.url || '/images/marketplace/placeholder-product.svg'}
                      alt={product.title.en}
                      className="h-96 w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {gallery.map((image: any) => (
                      <img
                        key={image.url}
                        src={image.url}
                        alt={product.title.en}
                        className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl font-semibold text-[#0F1111]">{product.title.en}</h1>
                  {product.summary && <p className="text-sm text-gray-600">{product.summary}</p>}
                  <div className="space-y-2 text-sm text-gray-700">
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
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      {Object.entries(product.specs || {}).map(([key, value]) => (
                        <li key={key} className="flex justify-between gap-4">
                          <span className="font-medium capitalize text-gray-500">{key.replace(/_/g, ' ')}</span>
                          <span>{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {attachments.length > 0 && (
                    <div className="rounded-2xl border border-[#0061A8]/30 bg-white p-4">
                      <h3 className="text-sm font-semibold text-[#0061A8]">Compliance documents</h3>
                      <ul className="mt-2 space-y-2 text-sm text-[#0F1111]">
                        {attachments.map((file: any) => (
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

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-[#0F1111]">Related items</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {product.related?.length ? (
                  product.related.map((related: any) => <ProductCard key={related._id} product={related} />)
                ) : (
                  <p className="text-sm text-gray-600">Additional items will appear as catalogue grows.</p>
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
