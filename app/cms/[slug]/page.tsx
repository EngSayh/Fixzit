import { CmsPage } from "@/src/server/models/CmsPage";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import Link from "next/link";

export const revalidate = 60;

export default async function CmsPageScreen(props: { params: Promise<{slug:string}>, searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  await connectToDatabase();
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
            dangerouslySetInnerHTML={{ __html: await renderMarkdown(page.content) }} 
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

// Enhanced markdown to HTML renderer
async function renderMarkdown(md: string){
  let html = md;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');
  
  // Lists
  html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li.*>.*<\/li>)/g, '<ul class="list-disc pl-6 mb-4">$1</ul>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\](([^)]+))/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
  
  // Paragraphs
  html = html.split(/\n{2,}/).map(p => {
    if (!p.match(/^<[h|u|o|l]/)) {
      return `<p class="mb-4">${p.replace(/\n/g,"<br/>")}</p>`;
    }
    return p;
  }).join("");
  
  return html;
}
