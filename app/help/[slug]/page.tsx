import { getDb } from '@/src/lib/mongo';
import { notFound } from 'next/navigation';

interface ArticlePageProps {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export default async function ArticlePage({ params }: ArticlePageProps) {
  const db = await getDb();
  const article = await db.collection('knowledge_articles')
    .findOne({ slug: params.slug, status: 'PUBLISHED' });

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[#0061A8]/10 text-[#0061A8] text-sm font-medium">
            {article.module}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
            {article.lang.toUpperCase()}
          </span>
          {article.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-1 rounded-full bg-gray-50 text-gray-500 text-xs">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>Version {article.version}</span>
          <span>•</span>
          <span>Updated {new Date(article.updatedAt || '').toLocaleDateString()}</span>
          <span>•</span>
          <span>Role: {article.roleScopes.join(', ')}</span>
        </div>
      </div>

      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: article.contentMDX }} />
      </div>

      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">Sources</h3>
        <ul className="space-y-2">
          {article.sources.map((source: any, index: number) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium">
                {source.type.toUpperCase()}
              </span>
              <span>{source.ref}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}