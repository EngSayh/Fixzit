import { getDatabase } from "@/lib/mongodb";
import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/src/lib/auth';
import Link from "next/link";

export const revalidate = 60;

type Article = { slug: string; title: string; content: string; category?: string; updatedAt?: string | Date };

/**
 * Server component that fetches a published help article by slug and renders the article page.
 *
 * If no published article matches the provided slug, renders a simple "Article not available." message.
 *
 * @param params - Route params object containing the article `slug`.
 * @returns JSX for the help article page or a fallback message when the article is unavailable.
 */
export default async function HelpArticlePage({ params }:{ params:{ slug:string }}){
  // Extract auth token from cookies or headers to determine tenantId
  const cookieStore = cookies();
  const cookieToken = cookieStore.get('fixzit_auth')?.value;
  const authHeader = headers().get('authorization') || '';
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const token = cookieToken || bearer;
  const payload = token ? verifyToken(token) : null;

  const db = await getDatabase();
  const coll = db.collection<Article>('helparticles');
  const tenantScope = payload?.tenantId
    ? { $or: [ { tenantId: payload.tenantId }, { tenantId: { $exists: false } }, { tenantId: null } ] }
    : { $or: [ { tenantId: { $exists: false } }, { tenantId: null } ] } as any;
  const a = await coll.findOne({ slug: params.slug, status: 'PUBLISHED', ...tenantScope } as any);
  if (!a){
    return <div className="mx-auto max-w-3xl p-6">Article not available.</div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumb */}
      <section className="bg-gradient-to-r from-[#0061A8] to-[#00A859] text-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
            <Link href="/help" className="hover:underline">Help Center</Link>
            <span>/</span>
            <span>{a.category || 'General'}</span>
          </div>
          <h1 className="text-3xl font-bold">{a.title}</h1>
        </div>
      </section>
      
      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid md:grid-cols-[1fr_280px] gap-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <article
              className="prose prose-lg max-w-none prose-headings:text-[var(--fixzit-text)] prose-a:text-[var(--fixzit-blue)] prose-strong:text-[var(--fixzit-text)]"
              dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(a.content) }}
            />
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>Last updated {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : ''}</div>
                <Link 
                  href="/help" 
                  className="text-[var(--fixzit-blue)] hover:text-[var(--fixzit-blue)]/80 font-medium"
                >
                  ← All articles
                </Link>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <h3 className="font-semibold text-[var(--fixzit-text)] mb-3">Was this helpful?</h3>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  👍 Yes
                </button>
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  👎 No
                </button>
              </div>
            </div>
            
            <div className="bg-[var(--fixzit-blue)] text-white rounded-lg p-4">
              <h4 className="font-semibold mb-2">Still need help?</h4>
              <p className="text-sm mb-3">Our support team is here to assist you.</p>
              <Link 
                href="/support/my-tickets"
                className="block w-full bg-white text-[var(--fixzit-blue)] px-4 py-2 rounded-md font-medium hover:bg-gray-100 text-center"
              >
                Contact Support
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
function renderMarkdownSafe(md: string) {
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
  const safe = escape(md || '');
  return safe
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
