"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Globe2, Lock, Shield, FileText } from "@/components/ui/icons";

type Article = {
  slug: string;
  title: string;
  category?: string;
  status?: string;
  updatedAt?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

export default function AdminHelpArticlesPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/help/articles?status=ALL&limit=100", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const articles = Array.isArray(data?.items) ? data.items : [];
      setItems(articles);
    } catch (_err) {
      setError("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const published = useMemo(
    () => items.filter((a) => a.status === "PUBLISHED"),
    [items],
  );
  const drafts = useMemo(
    () => items.filter((a) => a.status !== "PUBLISHED"),
    [items],
  );

  const renderRow = (article: Article) => (
    <div
      key={article.slug}
      className="grid grid-cols-4 gap-3 items-center py-2 px-3 rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-2 truncate">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <div className="truncate">
          <div className="font-medium text-foreground truncate">
            {article.title || "Untitled"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {article.slug}
          </div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {article.category || "General"}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {article.status === "PUBLISHED" ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success-foreground border border-success/20">
            <Globe2 className="w-3 h-3" />
            Published
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground border border-border">
            <Lock className="w-3 h-3" />
            Draft
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 text-sm">
        <span className="text-muted-foreground">
          {formatDate(article.updatedAt)}
        </span>
        <Link
          className="text-primary hover:text-primary/80 font-medium"
          href={`/help/${article.slug}`}
          target="_blank"
        >
          View
        </Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl py-10 px-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Superadmin · Help & Knowledge Center
          </p>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Help Articles
          </h1>
        </div>
        <button type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium disabled:opacity-50"
          aria-label="Refresh help articles list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Published</h2>
            <span className="text-sm text-muted-foreground">
              {published.length}
            </span>
          </div>
          <div className="space-y-2">
            {published.length ? (
              published.map(renderRow)
            ) : (
              <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3">
                No published articles.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drafts</h2>
            <span className="text-sm text-muted-foreground">
              {drafts.length}
            </span>
          </div>
          <div className="space-y-2">
            {drafts.length ? (
              drafts.map(renderRow)
            ) : (
              <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3">
                No drafts.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
