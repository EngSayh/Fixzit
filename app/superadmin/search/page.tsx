"use client";

import React from "react";
import { Suspense } from "react";
import { Search as SearchIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Results({ query }: { query: string }) {
  const [results, setResults] = React.useState<
    Array<{ title: string; href?: string; snippet?: string; entity?: string }>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        const items = Array.isArray(data?.results) ? data.results : [];
        type SearchResultRaw = {
          title?: string;
          name?: string;
          href?: string;
          url?: string;
          snippet?: string;
          description?: string;
          entity?: string;
          type?: string;
        };
        setResults(
          (items as SearchResultRaw[]).map((item) => ({
            title: item?.title ?? item?.name ?? "Result",
            href: item?.href ?? item?.url ?? "#",
            snippet: item?.snippet ?? item?.description ?? "",
            entity: item?.entity ?? item?.type,
          })),
        );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (error) {
    return <p className="text-sm text-destructive">Search error: {error}</p>;
  }

  if (!query.trim()) {
    return <p className="text-sm text-muted-foreground">Type a query to search across modules.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Searching…</p>;
  }

  if (!results.length) {
    return <p className="text-sm text-muted-foreground">No results found.</p>;
  }

  return (
    <div className="space-y-3">
      {results.map((r, idx) => (
        <Card key={`${r.href}-${idx}`} className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <span className="text-xs uppercase text-muted-foreground">{r.entity || "Result"}</span>
              <a href={r.href} className="hover:underline text-foreground">
                {r.title}
              </a>
            </CardTitle>
          </CardHeader>
          {r.snippet ? (
            <CardContent className="text-sm text-muted-foreground">{r.snippet}</CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function SuperadminSearchClient({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = React.useState(initialQuery);

  const submit = (evt?: React.FormEvent) => {
    evt?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const next = params.toString();
    // Keep URL in sync for refresh/share
    if (typeof window !== "undefined") {
      const url = next ? `/superadmin/search?${next}` : "/superadmin/search";
      window.history.replaceState(null, "", url);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Search</h1>
          <p className="text-muted-foreground mt-1">Find entities across superadmin modules</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex items-center gap-3">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(e);
            }}
            placeholder="Search users, tenants, jobs, vendors…"
            className="ps-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
            aria-label="Search superadmin"
          />
        </div>
        <Button type="submit" variant="default">
          Search
        </Button>
      </form>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Results query={q} />
      </Suspense>
    </div>
  );
}

export default function SuperadminSearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const initialQuery = (searchParams?.q as string | undefined) ?? "";
  return <SuperadminSearchClient initialQuery={initialQuery} />;
}
