import { CmsPage } from "@/server/models/CmsPage";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Link from "next/link";
import { renderMarkdownSanitized } from '@/lib/markdown';

export const revalidate = 60;

export default async function CmsPageScreen(props: { params: Promise<{slug:string}>, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  await connectToDatabase();
  const { slug } = params;
  const preview = searchParams?.preview === "1";
  const page = await CmsPage.findOne({ slug });
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="opacity-70">This page has not been authored yet.</p>
      </div>
    );
  }
  if (page.status !== "PUBLISHED" && !preview) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Unavailable</h1>
        <p className="opacity-70">This page is in draft.</p>
        <p className="mt-2 text-sm">Admins can preview with <code>?preview=1</code>.</p>
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
                Last updated {new Date(page.updatedAt).toLocaleDateString()} 
                {page.updatedBy && ` by ${page.updatedBy}`}
              </div>
              <Link 
                href="/" 
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
