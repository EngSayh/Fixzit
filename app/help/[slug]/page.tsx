import { connectToDatabase } from "@/lib/mongodb-unified";
import { HelpArticle, HelpArticleDoc } from "@/server/models/HelpArticle";
import Link from "next/link";
import { renderMarkdownSanitized } from '@/lib/markdown';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ClientDate from '@/components/ClientDate';
import { getServerI18n } from '@/lib/i18n/server';
import { logger } from '@/lib/logger';
import { getStaticHelpArticle } from '@/data/static-content';
import { isMongoUnavailableError } from '@/lib/mongo-build-guards';

export const revalidate = 60;

/**
 * Server component that fetches a published help article by slug and renders the article page.
 *
 * If no published article matches the provided slug, triggers a 404 response.
 *
 * @param params - Route params object containing the article `slug`.
 * @returns JSX for the help article page or triggers notFound() for unavailable articles.
 */
type HelpArticleLike = {
  slug: string;
  title: string;
  content: string;
  category?: string;
  status: HelpArticleDoc['status'];
  updatedAt?: Date;
};

async function loadHelpArticle(slug: string): Promise<HelpArticleLike | null> {
  try {
    await connectToDatabase();
    const fromDb = (await HelpArticle.findOne({ slug, status: 'PUBLISHED' })
      .lean()
      .exec()) as (HelpArticleDoc & { updatedAt?: Date | string }) | null;
    if (fromDb) {
      return {
        slug: fromDb.slug,
        title: fromDb.title,
        content: fromDb.content,
        category: fromDb.category ?? undefined,
        status: fromDb.status,
        updatedAt: fromDb.updatedAt ? new Date(fromDb.updatedAt) : undefined,
      };
    }
  } catch (error) {
    if (!isMongoUnavailableError(error)) {
      throw error;
    }
    logger.warn('[Help] Falling back to static help article', { slug });
  }

  const fallback = getStaticHelpArticle(slug);
  return fallback
    ? {
        slug: fallback.slug,
        title: fallback.title,
        content: fallback.content,
        category: fallback.category,
        status: (fallback as { status?: HelpArticleDoc['status'] }).status ?? 'PUBLISHED',
        updatedAt: fallback.updatedAt ? new Date(fallback.updatedAt) : undefined,
      }
    : null;
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await loadHelpArticle(params.slug);
  if (!article) {
    notFound();
  }
  const updatedAt = article.updatedAt;
  const { t } = await getServerI18n();
  // Derive dir from Accept-Language (simple heuristic); ClientLayout will enforce on client
  const accept = (await headers()).get('accept-language') || '';
  const isRTL = accept.toLowerCase().startsWith('ar');
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <section className="bg-gradient-to-r from-primary to-success text-primary-foreground py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
            <Link href="/help" className="hover:underline">
              {t('help.article.breadcrumb.home', 'Help Center')}
            </Link>
            <span>/</span>
            <span>{article.category || t('help.article.categoryFallback', 'General')}</span>
          </div>
          <h1 className="text-3xl font-bold">{article.title}</h1>
        </div>
      </section>
      
      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10 flex-1">
        <div className="grid md:grid-cols-[1fr_280px] gap-8">
          <div className="bg-card rounded-2xl shadow-md border border-border p-8">
            <article
              className="prose prose-lg max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(article.content) }}
            />
            
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  {t('help.article.updated', 'Last updated')}{' '}
                  {updatedAt ? <ClientDate date={updatedAt} format="date-only" /> : ''}
                </div>
                <Link 
                  href="/help" 
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  {t('help.article.breadcrumb.back', '← All articles')}
                </Link>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-card rounded-2xl shadow-md border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">
                {t('help.article.feedback.prompt', 'Was this helpful?')}
              </h3>
              <div className="flex gap-2">
                <button
                  aria-label={t('help.article.feedback.helpfulAria', 'Mark article as helpful')}
                  className="flex-1 px-3 py-2 border border-border rounded-2xl hover:bg-muted"
                >
                  {t('help.article.feedback.yes', '👍 Yes')}
                </button>
                <button
                  aria-label={t('help.article.feedback.notHelpfulAria', 'Mark article as not helpful')}
                  className="flex-1 px-3 py-2 border border-border rounded-2xl hover:bg-muted"
                >
                  {t('help.article.feedback.no', '👎 No')}
                </button>
              </div>
            </div>
            
            <div className="bg-primary text-primary-foreground rounded-2xl p-4">
              <h4 className="font-semibold mb-2">
                {t('help.article.sidebar.ctaTitle', 'Still need help?')}
              </h4>
              <p className="text-sm mb-3">
                {t('help.article.sidebar.ctaSubtitle', 'Our support team is here to assist you.')}
              </p>
              <Link 
                href="/support/my-tickets"
                className="block w-full bg-card text-primary px-4 py-2 rounded-2xl font-medium hover:bg-muted text-center"
              >
                {t('help.article.sidebar.cta', 'Contact Support')}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
