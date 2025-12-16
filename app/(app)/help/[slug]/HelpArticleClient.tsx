"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import ClientDate from "@/components/ClientDate";
import { sanitizeRichTextHtmlClient } from "@/lib/sanitize-html.client";

type HelpArticleClientProps = {
  article: {
    slug: string;
    title: string;
    category?: string;
    contentHtml: string;
    updatedAt?: string;
  };
  isRTL: boolean;
  strings: {
    home: string;
    categoryFallback: string;
    updated: string;
    back: string;
    feedbackPrompt: string;
    helpfulYes: string;
    helpfulNo: string;
    helpfulAria: string;
    notHelpfulAria: string;
    ctaTitle: string;
    ctaSubtitle: string;
    cta: string;
    commentsTitle: string;
    commentsPlaceholder: string;
    commentsSubmit: string;
    commentsSuccess: string;
    commentsError: string;
    commentsAuth: string;
  };
};

export default function HelpArticleClient({
  article,
  isRTL,
  strings,
}: HelpArticleClientProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentStatus, setCommentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const safeContentHtml = useMemo(
    () => sanitizeRichTextHtmlClient(article.contentHtml),
    [article.contentHtml],
  );

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setIsSubmitting(true);
    setCommentStatus("idle");
    try {
      const res = await fetch(`/api/help/articles/${article.slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setComment("");
      setCommentStatus("success");
    } catch (_err) {
      setCommentStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Breadcrumb */}
      <section className="bg-gradient-to-r from-primary to-success text-primary-foreground py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
            <Link href="/help" className="hover:underline">
              {strings.home}
            </Link>
            <span>/</span>
            <span>{article.category || strings.categoryFallback}</span>
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
              dangerouslySetInnerHTML={{ __html: safeContentHtml }}
            />

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  {strings.updated}{" "}
                  {article.updatedAt ? (
                    <ClientDate date={article.updatedAt} format="date-only" />
                  ) : (
                    ""
                  )}
                </div>
                <Link
                  href="/help"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  {strings.back}
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-card rounded-2xl shadow-md border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">
                {strings.feedbackPrompt}
              </h3>
              <div className="flex gap-2">
                <button
                  aria-label={strings.helpfulAria}
                  className="flex-1 px-3 py-2 border border-border rounded-2xl hover:bg-muted"
                >
                  {strings.helpfulYes}
                </button>
                <button
                  aria-label={strings.notHelpfulAria}
                  className="flex-1 px-3 py-2 border border-border rounded-2xl hover:bg-muted"
                >
                  {strings.helpfulNo}
                </button>
              </div>
            </div>

            <div className="bg-primary text-primary-foreground rounded-2xl p-4">
              <h4 className="font-semibold mb-2">{strings.ctaTitle}</h4>
              <p className="text-sm mb-3">{strings.ctaSubtitle}</p>
              <Link
                href="/support/my-tickets"
                className="block w-full bg-card text-primary px-4 py-2 rounded-2xl font-medium hover:bg-muted text-center"
              >
                {strings.cta}
              </Link>
            </div>

            <div className="bg-card rounded-2xl shadow-md border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">
                {strings.commentsTitle}
              </h3>
              <form className="space-y-3" onSubmit={submitComment}>
                <label className="sr-only" htmlFor="comment">
                  {strings.commentsTitle}
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={strings.commentsPlaceholder}
                  className="w-full border border-border rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 min-h-[100px]"
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {strings.commentsAuth}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting || !comment.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSubmitting ? "..." : strings.commentsSubmit}
                  </button>
                </div>
                {commentStatus === "success" && (
                  <p className="text-xs text-success">
                    {strings.commentsSuccess}
                  </p>
                )}
                {commentStatus === "error" && (
                  <p className="text-xs text-destructive">
                    {strings.commentsError}
                  </p>
                )}
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
