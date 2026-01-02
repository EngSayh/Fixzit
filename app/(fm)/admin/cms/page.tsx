"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Admin UI for viewing and editing CMS pages.
 *
 * Renders a simple editor that lets you select a page by slug, edit its title,
 * markdown content, and publication status, and save changes back to the server.
 *
 * Behavior:
 * - Loads page data from GET /api/cms/pages/{slug} whenever the slug changes. If the page exists,
 *   title, content, and status are populated; otherwise fields are cleared and status defaults to DRAFT.
 * - Saves edits by sending a PATCH request with JSON body { title, content, status } to /api/cms/pages/{slug}.
 *   Shows a browser alert with "Saved" on success or "Failed" on failure.
 *
 * @returns A React element containing the CMS page editor UI.
 */
export default function AdminCMS() {
  const { t } = useTranslation();
  const [slug, setSlug] = useState("privacy");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/cms/pages/${slug}`);
        if (r.ok) {
          const p = await r.json();
          setTitle(p.title);
          setContent(p.content);
          setStatus(p.status);
        } else {
          setTitle("");
          setContent("");
          setStatus("DRAFT");
        }
      } catch (error) {
        logger.error("Failed to load CMS page", { error, slug });
        setTitle("");
        setContent("");
        setStatus("DRAFT");
        toast.error(t("admin.cms.loadError", "Failed to load page"));
      }
    })();
  }, [slug]);

  const save = async () => {
    const toastId = toast.loading(t("save.saving", "Saving..."));
    try {
      const r = await fetch(`/api/cms/pages/${slug}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ title, content, status }),
        credentials: "same-origin",
      });
      if (r.ok) {
        toast.success(t("save.success", "Saved successfully"), { id: toastId });
      } else {
        const errorText = await r.text();
        toast.error(`${t("save.failed", "Save failed")}: ${errorText}`, {
          id: toastId,
        });
      }
    } catch (error) {
      logger.error("Failed to save CMS page", { error, slug });
      toast.error(t("save.networkError", "Failed: network error"), {
        id: toastId,
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">
        {t("admin.cms.title", "CMS Pages")}
      </h1>
      <div className="flex gap-2">
        <input
          className="px-3 py-2 border border-border rounded-2xl"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t("admin.cms.slug", "Slug (e.g., privacy)")}
        />
        <select
          className="px-3 py-2 border border-border rounded-2xl"
          value={status}
          onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
        >
          <option value="DRAFT">{t("admin.cms.draft", "DRAFT")}</option>
          <option value="PUBLISHED">
            {t("admin.cms.published", "PUBLISHED")}
          </option>
        </select>
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90"
          onClick={save}
          aria-label={t("admin.cms.saveAria", "Save CMS page content")}
        >
          {t("common.save", "Save")}
        </button>
      </div>
      <input
        className="w-full px-3 py-2 border border-border rounded-2xl"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("admin.cms.titleLabel", "Title")}
      />
      <textarea
        className="w-full px-3 py-2 border border-border rounded-2xl h-[420px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("admin.cms.content", "Markdown content...")}
      />
    </div>
  );
}
