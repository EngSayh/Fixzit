import { CmsPage } from "@/server/models/CmsPage";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Link from "next/link";
import { renderMarkdownSanitized } from '@/lib/markdown';
import { cookies } from 'next/headers';
import ClientDate from '@/components/ClientDate';

export const revalidate = 60;

// Helper to get translations based on cookie
async function getTranslations() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('fxz.lang')?.value || 'en';
  const isArabic = lang === 'ar';
  
  return {
    notFound: isArabic ? 'غير موجود' : 'Not found',
    notAuthored: isArabic ? 'هذه الصفحة لم تتم كتابتها بعد.' : 'This page has not been authored yet.',
    unavailable: isArabic ? 'غير متاح' : 'Unavailable',
    draft: isArabic ? 'هذه الصفحة في المسودة.' : 'This page is in draft.',
    previewHint: isArabic ? 'يمكن للمسؤولين المعاينة باستخدام' : 'Admins can preview with',
    backToHome: isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'
  };
}

export default async function CmsPageScreen(props: { params: Promise<{slug:string}>, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const t = await getTranslations();
  await connectToDatabase();
  const { slug } = params;
  const preview = searchParams?.preview === "1";
  const page = await CmsPage.findOne({ slug });
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">{t.notFound}</h1>
        <p className="opacity-70">{t.notAuthored}</p>
      </div>
    );
  }
  if (page.status !== "PUBLISHED" && !preview) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">{t.unavailable}</h1>
        <p className="opacity-70">{t.draft}</p>
        <p className="mt-2 text-sm">{t.previewHint} <code>?preview=1</code>.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))] text-white py-12">{/* FIXED: was #023047 (banned) */}
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-bold">{page.title}</h1>
        </div>
      </section>
      
      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="bg-card rounded-2xl shadow-md border border-border p-8">
                    <article 
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(page.content) }} 
          />
          
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Last updated <ClientDate date={page.updatedAt} format="date-only" />
                {page.updatedBy && ` by ${page.updatedBy}`}
              </div>
              <Link 
                href="/" 
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← {t.backToHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
