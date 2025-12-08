"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { FileText, Scale, AlertCircle, Mail, Phone } from "lucide-react";
import { renderMarkdownSanitized } from "@/lib/markdown";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

import { logger } from "@/lib/logger";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
/**
 * Default terms of service content shown when CMS content is not available or not published.
 */
const DEFAULT_TERMS_CONTENT = `# Terms of Service

**Last Updated:** October 24, 2025

## Agreement to Terms
By accessing and using Fixzit Enterprise ("Service"), you agree to be bound by these Terms of Service.

## Use of Service
### Acceptable Use
- Use the Service only for lawful purposes
- Maintain the security of your account credentials
- Do not interfere with or disrupt the Service
- Do not attempt to gain unauthorized access

### Prohibited Activities
- Violating laws or regulations
- Infringing intellectual property rights
- Distributing malware or harmful code
- Engaging in fraudulent activities
- Harassing or abusing other users

## User Accounts
### Registration
- Provide accurate and complete information
- Maintain the security of your password
- Notify us immediately of any unauthorized access

### Account Termination
We reserve the right to suspend or terminate accounts that violate these terms.

## Intellectual Property
All content, features, and functionality are owned by Fixzit Enterprise and protected by international copyright, trademark, and other intellectual property laws.

## Service Availability
- We strive for 99.9% uptime but do not guarantee uninterrupted access
- Scheduled maintenance will be announced in advance
- We are not liable for service disruptions beyond our control

## Data and Privacy
Your use of the Service is also governed by our Privacy Policy. We collect and use data as described in that policy.

## Limitation of Liability
Fixzit Enterprise shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.

## Indemnification
You agree to indemnify and hold harmless Fixzit Enterprise from any claims arising from your use of the Service or violation of these terms.

## Modifications to Terms
We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance of modified terms.

## Governing Law
These terms are governed by the laws of the United Arab Emirates.

## Dispute Resolution
Any disputes shall be resolved through:
1. Good faith negotiation
2. Mediation
3. Binding arbitration in Dubai, UAE

## Contact
For questions about these terms:
- Email: ${EMAIL_DOMAINS.legal}
- Phone: +966 XX XXX XXXX

## Severability
If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`;

/**
 * Terms of Service Page (Public View)
 *
 * Displays terms of service managed through CMS admin interface.
 * Fetches from /api/cms/pages/terms and falls back to default content.
 * Supports RTL languages and responsive design.
 *
 * @returns Terms page with hero, info cards, content, and contact sections
 */
export default function TermsPage() {
  const { t, isRTL } = useTranslation();
  const [content, setContent] = useState<string>("");
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadTermsContent = useCallback(async () => {
    try {
      const response = await fetch("/api/cms/pages/terms");

      if (response.ok) {
        const data = await response.json();
        if (data.status === "PUBLISHED") {
          setTitle(data.title);
          setContent(data.content);
        } else {
          setTitle(t("terms.title", "Terms of Service"));
          setContent(DEFAULT_TERMS_CONTENT);
        }
      } else {
        setTitle(t("terms.title", "Terms of Service"));
        setContent(DEFAULT_TERMS_CONTENT);
      }
    } catch (err) {
      logger.error(
        "Error fetching terms content",
        err instanceof Error ? err : new Error(String(err)),
        { route: "/terms" },
      );
      setTitle(t("terms.title", "Terms of Service"));
      setContent(DEFAULT_TERMS_CONTENT);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTermsContent();
  }, [loadTermsContent]);

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
            { route: "/terms", action: "render-markdown" },
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
      <section className="bg-gradient-to-r from-primary via-primary to-success text-white py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div
            className={`flex items-center gap-4 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <Scale className="w-12 h-12" />
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-xl opacity-90">
            {t(
              "terms.subtitle",
              "Please read these terms carefully before using our services.",
            )}
          </p>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-8 bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl">
              <FileText className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("terms.binding", "Legally Binding")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("terms.bindingDesc", "Enforceable agreement")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl">
              <Scale className="w-8 h-8 text-success flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("terms.fair", "Fair Terms")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("terms.fairDesc", "Balanced rights")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-secondary-foreground flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("terms.clear", "Clear Language")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("terms.clearDesc", "Easy to understand")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-2xl">
              <FileText className="w-8 h-8 text-accent-foreground flex-shrink-0" />
              <div>
                <div className="font-semibold text-foreground">
                  {t("terms.updated", "Regularly Updated")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("terms.updatedDesc", "Kept current")}
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
              {t("terms.contactTitle", "Questions About Terms?")}
            </h2>
            <p className="text-foreground mb-6">
              {t(
                "terms.contactDesc",
                "Contact our legal team for clarification about these terms of service.",
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("terms.email", "Email")}
                  </div>
                  <a
                    href={`mailto:${EMAIL_DOMAINS.legal}`}
                    className="text-primary hover:text-primary/90"
                  >
                    {EMAIL_DOMAINS.legal}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t("terms.phone", "Phone")}
                  </div>
                  <a
                    href="tel:+966XXXXXXXX"
                    className="text-primary hover:text-primary/90"
                  >
                    +966 XX XXX XXXX
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {t("terms.lastUpdated", "Last Updated")}:{" "}
                <span className="font-semibold">October 24, 2025</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
