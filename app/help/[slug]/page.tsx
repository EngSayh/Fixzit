import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/mongodb-unified";
import { renderMarkdownSanitized } from "@/lib/markdown";

export const revalidate = 60;

type Article = {
  slug: string;
  title: string;
  content: string;
  category?: string;
  status?: string;
  updatedAt?: Date | string;
};

// Use sanitized markdown renderer to prevent XSS
async function renderMarkdown(md: string): Promise<string> {
  return renderMarkdownSanitized(md);
}

export default async function HelpArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const db = await getDatabase();
  const a =
    (await db
      .collection<Article>("helparticles")
      .findOne({ slug: params.slug, status: "PUBLISHED" } as Partial<Article>)) ||
    ({
      slug: params.slug,
      title: "Article not available.",
      content: "Article not available.",
      category: "General",
      status: "PUBLISHED",
    } as Article);

  if (!a) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <Link href="/help" className="text-sm text-primary hover:underline">
          ← Help Center
        </Link>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <Link href="/help">All articles</Link>
          <Link href="/support/my-tickets">Contact Support</Link>
        </div>
      </div>

      <article className="bg-card rounded-2xl p-6 shadow-sm">
        <p className="text-xs uppercase text-muted-foreground mb-1">
          {a.category || "General"}
        </p>
        <h1 className="text-3xl font-semibold mb-2">
          {a.title || "Article not available."}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Last updated{" "}
          {a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : ""}
        </p>

        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: await renderMarkdown(a.content) }}
        />
      </article>
    </div>
  );
}
