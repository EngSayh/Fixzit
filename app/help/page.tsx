import { getDb } from '@/src/lib/mongo';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function KbPage() {
  const db = await getDb();
  const native = (db as any).connection?.db || (db as any).db;
  const articles = await native.collection('knowledge_articles')
    .find({ status: 'PUBLISHED' }).project({ title:1, lang:1, module:1, slug:1 }).limit(60).toArray();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
        <p className="text-gray-600">Find answers, guides, and help articles</p>
      </div>

      {/* Articles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a:any) => (
          <Link key={a._id} href={`/help/${a.slug}`} className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs px-2 py-1 rounded-full bg-[#0061A8]/10 text-[#0061A8] font-medium">
                {a.module}
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {a.lang.toUpperCase()}
              </div>
            </div>
            <div className="font-medium text-gray-900">{a.title}</div>
          </Link>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <p>No articles available yet.</p>
            <p className="text-sm mt-2">Check back soon for helpful guides and tutorials.</p>
          </div>
        </div>
      )}
    </div>
  );
}