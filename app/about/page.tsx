import { getServerI18n } from "@/lib/i18n/server";
import {
  Building2,
  Users,
  Target,
  Award,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { renderMarkdownSanitized } from "@/lib/markdown";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { CONTACT_INFO } from "@/config/contact";

/**
 * Default about content shown when CMS content is not available or not published.
 */
const DEFAULT_ABOUT_CONTENT = `# About Fixzit Enterprise

**Your Trusted Partner in Facilities Management**

## Who We Are
Fixzit Enterprise is a leading facilities management and maintenance solution provider, dedicated to transforming how organizations manage their properties, assets, and maintenance operations.

## Our Mission
To empower organizations with innovative, efficient, and user-friendly tools that streamline facilities management, reduce operational costs, and enhance service delivery.

## What We Do
- **Comprehensive Facilities Management**: End-to-end solutions for property and asset management
- **Smart Maintenance Scheduling**: AI-powered preventive and predictive maintenance
- **Work Order Management**: Streamlined request-to-resolution workflows
- **Vendor & Contractor Management**: Centralized vendor coordination and performance tracking
- **Real-time Analytics**: Data-driven insights for better decision-making
- **Mobile-First Approach**: Access your facilities from anywhere, anytime

## Why Choose Us
- **15+ Years of Industry Experience**
- **Trusted by 500+ Organizations**
- **99.9% Platform Uptime**
- **24/7 Customer Support**
- **ISO 9001:2015 Certified**
- **GDPR & Data Security Compliant**

## Our Values
**Excellence**: Delivering superior quality in every interaction
**Innovation**: Continuously improving through technology
**Integrity**: Building trust through transparency
**Customer Focus**: Your success is our priority`;

/**
 * Dynamically get the base URL from request headers.
 * This is safer than relying on NEXT_PUBLIC_SITE_URL which may not be set in all environments.
 */
async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

/**
 * Generate metadata for SEO optimization.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  const baseUrl = await getBaseUrl();

  return {
    title: t(
      "about.metaTitle",
      "About Us - Fixzit Enterprise | Leading Facilities Management Solutions",
    ),
    description: t(
      "about.metaDesc",
      "Learn about Fixzit Enterprise, a leading facilities management solution provider with 15+ years of experience, serving 500+ clients worldwide with 99.9% uptime.",
    ),
    openGraph: {
      title: t("about.metaTitle", "About Us - Fixzit Enterprise"),
      description: t(
        "about.metaDesc",
        "Leading facilities management and maintenance solution provider serving 500+ organizations worldwide.",
      ),
      url: `${baseUrl}/about`,
      siteName: "Fixzit Enterprise",
      type: "website",
      images: [
        {
          url: `${baseUrl}/images/og-about.jpg`,
          width: 1200,
          height: 630,
          alt: "Fixzit Enterprise - About Us",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("about.metaTitle", "About Us - Fixzit Enterprise"),
      description: t(
        "about.metaDesc",
        "Leading facilities management solution provider with 15+ years of experience.",
      ),
      images: [`${baseUrl}/images/twitter-about.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/about`,
    },
  };
}

/**
 * About Us Page (Public View)
 *
 * Displays company information and values managed through CMS admin interface.
 * Fetches from /api/cms/pages/about and falls back to default content.
 * Supports RTL languages and responsive design.
 * Includes JSON-LD structured data for SEO.
 *
 * @returns About page with hero, stats, content, and contact sections
 */
export default async function AboutPage() {
  // Server-side minimal i18n
  const { t, isRTL } = await getServerI18n();
  const baseUrl = await getBaseUrl();

  // Server fetch of CMS about page. Server components can await fetch directly.
  let title = t("about.title", "About Us");
  let content = DEFAULT_ABOUT_CONTENT;

  try {
    const res = await fetch(`${baseUrl}/api/cms/pages/about`, {
      // force no-store so latest content is fetched server-side; adjust if caching required
      cache: "no-store",
    });

    if (res.ok) {
      let data: { status?: string; title?: string; content?: string } = {};
      try {
        data = await res.json();
      } catch {
        // If JSON parse fails, use defaults
      }

      if (data?.status === "PUBLISHED") {
        title = data.title || title;
        content = data.content || content;
      }
    }
  } catch {
    // swallow errors and use default content
  }

  const renderedContent = await renderMarkdownSanitized(content);

  // Strip duplicate H1 from CMS markdown content if present
  // CMS editors often add an H1 which duplicates the hero title
  const contentWithoutH1 = renderedContent.replace(/<h1[^>]*>.*?<\/h1>/i, "");
  const contactPhone = (CONTACT_INFO.phone || "").trim();
  const sanitizedTel = contactPhone ? contactPhone.replace(/[^+\d]/g, "") : "";

  // JSON-LD structured data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fixzit Enterprise",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: t(
      "about.metaDesc",
      "Leading facilities management and maintenance solution provider serving 500+ organizations worldwide.",
    ),
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      // Add specific address details when available
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contactPhone || undefined,
      contactType: "customer service",
      email: CONTACT_INFO.email,
      availableLanguage: ["en", "ar"],
    },
    sameAs: [
      CONTACT_INFO.social.twitter,
      CONTACT_INFO.social.linkedin,
      CONTACT_INFO.social.facebook,
      CONTACT_INFO.social.instagram,
    ].filter(Boolean), // Remove empty strings
  };

  // JSON-LD structured data for WebSite
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fixzit Enterprise",
    url: baseUrl,
    description: t(
      "about.metaDesc",
      "Leading facilities management and maintenance solution provider serving 500+ organizations worldwide.",
    ),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div
        className={`min-h-screen bg-gradient-to-b from-white to-gray-50 ${isRTL ? "rtl" : "ltr"}`}
      >
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary))] to-[hsl(var(--success))] text-white py-12">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex items-center gap-4 mb-4">
              <Building2 className="w-12 h-12" aria-hidden="true" />
              <h1 className="text-4xl font-bold">{title}</h1>
            </div>
            <p className="text-xl opacity-90">
              {t(
                "about.subtitle",
                "Building better facilities management solutions for the modern enterprise.",
              )}
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section
          className="py-8 bg-card shadow-sm"
          aria-label={t("about.statsSection", "Company Statistics")}
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl">
                <Users
                  className="w-8 h-8 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-2xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">
                    {t("about.clients", "Clients Worldwide")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl">
                <Target
                  className="w-8 h-8 text-success flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    99.9%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("about.uptime", "Platform Uptime")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
                <Award
                  className="w-8 h-8 text-secondary-foreground flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-2xl font-bold text-foreground">15+</div>
                  <div className="text-sm text-muted-foreground">
                    {t("about.experience", "Years Experience")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-2xl">
                <Building2
                  className="w-8 h-8 text-accent-foreground flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-2xl font-bold text-foreground">10K+</div>
                  <div className="text-sm text-muted-foreground">
                    {t("about.properties", "Properties Managed")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section
          className="py-12"
          aria-label={t("about.contentSection", "About Our Company")}
        >
          <div className="mx-auto max-w-4xl px-4 lg:px-6">
            <div className="bg-card rounded-2xl shadow-md border border-border p-8 md:p-12">
              <article className="prose prose-lg max-w-none text-start prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
                <div dangerouslySetInnerHTML={{ __html: contentWithoutH1 }} />
              </article>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          className="py-12 bg-muted"
          aria-label={t("about.contactSection", "Contact Information")}
        >
          <div className="mx-auto max-w-4xl px-4 lg:px-6">
            <div className="bg-card rounded-2xl shadow-md border border-border p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6 text-primary" aria-hidden="true" />
                {t("about.contactTitle", "Get in Touch")}
              </h2>
              <p className="text-foreground mb-6">
                {t(
                  "about.contactDesc",
                  "Have questions about our services? Our team is here to help you get started.",
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail
                    className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      {t("about.email", "Email")}
                    </div>
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="text-primary hover:text-primary"
                      aria-label={t(
                        "about.emailLabel",
                        `Send email to ${CONTACT_INFO.email}`,
                      )}
                    >
                      {CONTACT_INFO.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone
                    className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      {t("about.phone", "Phone")}
                    </div>
                    {contactPhone ? (
                      <a
                        href={`tel:${sanitizedTel}`}
                        className="text-primary hover:text-primary"
                        aria-label={t(
                          "about.phoneLabel",
                          `Call ${contactPhone}`,
                        )}
                      >
                        {contactPhone}
                      </a>
                    ) : (
                      <div className="text-muted-foreground">
                        {t(
                          "about.phoneUnavailable",
                          "Phone number not configured",
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
