import { CmsPage } from "@/src/server/models/CmsPage";
import { db } from "@/src/lib/mongo";
import Link from "next/link";
import { renderMarkdownSanitized } from "@/src/lib/markdown";

export const revalidate = 60;

export default async function CmsPageScreen({ params, searchParams }: { params:{slug:string}, searchParams:any }){
  await db;
  const { slug } = params;
  const preview = searchParams?.preview === "1";
  const page = await (CmsPage as any).findOne({ slug });
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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#023047] to-[#0061A8] text-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-bold">{page.title}</h1>
        </div>
      </section>
      
      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <article 
            className="prose prose-lg max-w-none prose-headings:text-[var(--fixzit-text)] prose-a:text-[var(--fixzit-blue)] prose-strong:text-[var(--fixzit-text)]" 
            dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(page.content) }} 
          />
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Last updated {new Date(page.updatedAt).toLocaleDateString()} 
                {page.updatedBy && ` by ${page.updatedBy}`}
              </div>
              <Link 
                href="/" 
                className="text-[var(--fixzit-blue)] hover:text-[var(--fixzit-blue)]/80 font-medium"
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


