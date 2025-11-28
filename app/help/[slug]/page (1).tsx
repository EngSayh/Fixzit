import { connectToDatabase } from "@/lib/mongodb-unified";
import { HelpArticle, HelpArticleDoc } from "@/server/models/HelpArticle";
import { renderMarkdownSanitized } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { getServerI18n } from '@/lib/i18n/server';
import { logger } from '@/lib/logger';
import { getStaticHelpArticle } from '@/data/static-content';
import { isMongoUnavailableError } from '@/lib/mongo-build-guards';
import HelpArticleClient from './HelpArticleClient';

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

  const { t, isRTL } = await getServerI18n();
  const renderedContent = await renderMarkdownSanitized(article.content);

  const strings = {
    home: t('help.article.breadcrumb.home', 'Help Center'),
    categoryFallback: t('help.article.categoryFallback', 'General'),
    updated: t('help.article.updated', 'Last updated'),
    back: t('help.article.breadcrumb.back', '← All articles'),
    feedbackPrompt: t('help.article.feedback.prompt', 'Was this helpful?'),
    helpfulYes: t('help.article.feedback.yes', '👍 Yes'),
    helpfulNo: t('help.article.feedback.no', '👎 No'),
    helpfulAria: t('help.article.feedback.helpfulAria', 'Mark article as helpful'),
    notHelpfulAria: t('help.article.feedback.notHelpfulAria', 'Mark article as not helpful'),
    ctaTitle: t('help.article.sidebar.ctaTitle', 'Still need help?'),
    ctaSubtitle: t('help.article.sidebar.ctaSubtitle', 'Our support team is here to assist you.'),
    cta: t('help.article.sidebar.cta', 'Contact Support'),
    commentsTitle: t('help.article.comments.title', 'Leave a comment'),
    commentsPlaceholder: t('help.article.comments.placeholder', 'Share your feedback (text only)'),
    commentsSubmit: t('help.article.comments.submit', 'Post comment'),
    commentsSuccess: t('help.article.comments.success', 'Comment posted'),
    commentsError: t('help.article.comments.error', 'Could not post comment'),
    commentsAuth: t('help.article.comments.auth', 'Please log in to comment')
  };

  return (
    <HelpArticleClient
      article={{
        slug: article.slug,
        title: article.title,
        category: article.category,
        contentHtml: renderedContent,
        updatedAt: article.updatedAt ? article.updatedAt.toISOString() : undefined,
      }}
      isRTL={isRTL}
      strings={strings}
    />
  );
}
