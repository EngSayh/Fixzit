"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Shield, Lock, Eye, FileText, Mail, Phone } from "lucide-react";
import { renderMarkdownSanitized } from "@/lib/markdown";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

import { logger } from "@/lib/logger";
/**
 * Default privacy policy content shown when CMS content is not available or not published.
 * Defined at module level to prevent recreation on each render.
 */
const DEFAULT_PRIVACY_CONTENT = `# Privacy Policy

**Last Updated:** October 16, 2025

## Introduction
Welcome to Fixzit Enterprise. We protect your privacy and secure your personal information.

## Information We Collect
- Personal information (name, email, phone)
- Corporate ID and employee information  
- Usage data and analytics
- Work order and property data

## How We Use Your Information
For service delivery, account management, communication, analytics, security, and legal compliance.

## Data Security
Industry-standard security: encryption, access controls, regular audits, 24/7 monitoring.

## Your Rights
Access, correct, delete, export your data, and opt-out of marketing communications.

## Contact
For privacy inquiries: ${EMAIL_DOMAINS.privacy} | Phone: +966 XX XXX XXXX`;

/**
 * Privacy Policy Page (Public View)
 *
 * Displays privacy policy content managed through CMS admin interface.
 * Fetches from /api/cms/pages/privacy and falls back to default content.
 * Supports RTL languages and responsive design.
 *
 * @returns Privacy policy page with hero, info cards, content, and contact sections
 */
export default function PrivacyPage() {
  const { t, isRTL } = useTranslation();
  const [content, setContent] = useState<string>("");
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadPrivacyPolicy = useCallback(async () => {
    try {
      const response = await fetch("/api/cms/pages/privacy");

      if (response.ok) {
        const data = await response.json();
        if (data.status === "PUBLISHED") {
          setTitle(data.title);
          setContent(data.content);
        } else {
          setTitle(t("privacy.title", "Privacy Policy"));
          setContent(DEFAULT_PRIVACY_CONTENT);
        }
      } else {
        setTitle(t("privacy.title", "Privacy Policy"));
        setContent(DEFAULT_PRIVACY_CONTENT);
      }
    } catch (err) {
      logger.error(
        "Error fetching privacy policy",
        err instanceof Error ? err : new Error(String(err)),
        { route: "/privacy" },
      );
      setTitle(t("privacy.title", "Privacy Policy"));
      setContent(DEFAULT_PRIVACY_CONTENT);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrivacyPolicy();
  }, [loadPrivacyPolicy]);

  // Render markdown to HTML when content changes
  useEffect(() => {
    if (content) {
      renderMarkdownSanitized(content)
        .then((html) => {
          setRenderedContent(html);
        })
        .catch((err) => {
          logger.error(
            "Error rendering markdown",
            err instanceof Error ? err : new Error(String(err)),
            { route: "/privacy", action: "render-markdown" },
          );
          // Fallback to plain text wrapped in paragraphs
          setRenderedContent(
            `<div class="prose max-w-none"><p>${content.replace(/\n/g, "</p><p>")}</p></div>`,
          );
        });
    }
  }, [content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {t("common.loading", "Loading...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-white to-gray-50 ${isRTL ? "rtl" : "ltr"}`}
    >
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary))] to-[hsl(var(--success))] text-white py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-12 h-12" />
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-xl opacity-90">
            {t(
              "privacy.subtitle",
              "Your privacy is our priority. Learn how we protect and manage your data.",
            )}
          </p>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-8 bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl">
              <Lock className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("privacy.encrypted", "Encrypted")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("privacy.encryptedDesc", "End-to-end encryption")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl">
              <Eye className="w-8 h-8 text-success flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("privacy.transparent", "Transparent")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("privacy.transparentDesc", "Clear data usage")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
              <Shield className="w-8 h-8 text-secondary-foreground flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("privacy.compliant", "Compliant")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("privacy.compliantDesc", "GDPR & CCPA certified")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-2xl">
              <FileText className="w-8 h-8 text-accent-foreground flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("privacy.yourRights", "Your Rights")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("privacy.yourRightsDesc", "Full data control")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-card rounded-2xl shadow-md border border-border p-8 md:p-12">
            <article className="prose prose-lg max-w-none text-start prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
              <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
            </article>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-muted">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-card rounded-2xl shadow-md border border-border p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              {t("privacy.contactTitle", "Privacy Questions?")}
            </h2>
            <p className="text-foreground mb-6">
              {t(
                "privacy.contactDesc",
                "Contact our Privacy Officer for questions about privacy practices or to exercise your rights.",
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("privacy.email", "Email")}
                  </div>
                  <a
                    href={`mailto:${EMAIL_DOMAINS.privacy}`}
                    className="text-primary hover:text-primary/90"
                  >
                    {EMAIL_DOMAINS.privacy}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("privacy.phone", "Phone")}
                  </div>
                  <a
                    href="tel:+971XXXXXXXX"
                    className="text-primary hover:text-primary/90"
                  >
                    +971 XX XXX XXXX
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {t("privacy.lastUpdated", "Last Updated")}:{" "}
                <span className="font-semibold">October 16, 2025</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
