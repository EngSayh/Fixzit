"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Bot,
  BookOpen,
  Play,
  ChevronRight,
  Star,
  Users,
  Building2,
  DollarSign,
  Wrench,
  FileText,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

type Tutorial = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: Difficulty;
  featured?: boolean;
  completed?: boolean;
  href: string;
};

type HelpArticle = {
  slug: string;
  title: string;
  category?: string;
  updatedAt?: string;
};

const formatUpdatedDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "facility management":
      return <Building2 className="w-5 h-5 text-primary" />;
    case "work orders":
      return <Wrench className="w-5 h-5 text-success" />;
    case "procurement":
      return <FileText className="w-5 h-5 text-secondary-foreground" />;
    case "customer service":
      return <Users className="w-5 h-5 text-accent-foreground" />;
    case "finance":
      return <DollarSign className="w-5 h-5 text-success" />;
    default:
      return <BookOpen className="w-5 h-5 text-muted-foreground" />;
  }
};

const getDifficultyColor = (
  difficulty: string,
  t: ReturnType<typeof useTranslation>["t"],
) => {
  switch (difficulty) {
    case "Beginner":
    case t("helpCenter.difficulty.beginner"):
      return "bg-success/10 text-success-foreground";
    case "Intermediate":
    case t("helpCenter.difficulty.intermediate"):
      return "bg-warning/10 text-warning-foreground";
    case "Advanced":
    case t("helpCenter.difficulty.advanced"):
      return "bg-destructive/10 text-destructive-foreground";
    default:
      return "bg-muted text-foreground";
  }
};

export default function HelpHome() {
  const { t, isRTL } = useTranslation();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [hasArticleError, setHasArticleError] = useState(false);

  const strings = useMemo(
    () => ({
      title: t("helpCenterV2.title", "Fixzit Knowledge Center"),
      subtitle: t(
        "helpCenterV2.subtitle",
        "Interactive tutorials, guides, and resources to master Fixzit Enterprise",
      ),
      askAi: t("helpCenterV2.askAssistant", "Ask AI Assistant"),
      createTicket: t("helpCenterV2.createTicket", "Create Support Ticket"),
      viewTickets: t("helpCenterV2.viewTickets", "View My Tickets"),
      interactiveTitle: t(
        "helpCenterV2.interactiveTutorials",
        "Interactive Tutorials",
      ),
      interactiveSubtitle: t(
        "helpCenterV2.interactiveSubtitle",
        "Learn Fixzit step-by-step with our guided tutorials",
      ),
      viewAllTutorials: t(
        "helpCenterV2.viewAllTutorials",
        "View All Tutorials",
      ),
      helpArticles: t("helpCenterV2.helpArticles", "Latest Help Articles"),
      articlesSubtitle: t(
        "helpCenterV2.articlesSubtitle",
        "Fresh product docs and how-tos",
      ),
      readMore: t("helpCenterV2.readMore", "Read More"),
      emptyArticles: t("helpCenterV2.emptyArticles", "No articles found."),
      updated: t("helpCenterV2.updated", "Updated"),
      loadingArticles: t("helpCenterV2.loadingArticles", "Loading articles..."),
      generalCategory: t("helpCenterV2.generalCategory", "General"),
      systemOverview: t("helpCenterV2.systemOverview", "System Overview"),
      overviewSubtitle: t(
        "helpCenterV2.overviewSubtitle",
        "High-level overview of the system",
      ),
      propertiesTitle: t("helpCenterV2.propertiesTitle", "Properties"),
      propertiesCopy: t(
        "helpCenterV2.propertiesCopy",
        "Add and manage properties",
      ),
      workOrdersTitle: t("helpCenterV2.workOrdersTitle", "Work Orders"),
      workOrdersCopy: t(
        "helpCenterV2.workOrdersCopy",
        "Create and track work orders",
      ),
      vendorsTitle: t("helpCenterV2.vendorsTitle", "Vendors"),
      vendorsCopy: t(
        "helpCenterV2.vendorsCopy",
        "Manage vendors and contracts",
      ),
      financeTitle: t("helpCenterV2.financeTitle", "Finance"),
      financeCopy: t(
        "helpCenterV2.financeCopy",
        "Manage budgets, invoices, and expenses",
      ),
      untitledArticle: t("helpCenterV2.untitledArticle", "Untitled Article"),
    }),
    [t],
  );

  const tutorials: Tutorial[] = useMemo(
    () => [
      {
        id: "getting-started",
        title: t(
          "helpCenterV2.tutorials.gettingStarted.title",
          "Getting Started with Fixzit FM",
        ),
        description: t(
          "helpCenterV2.tutorials.gettingStarted.description",
          "Learn the basics of facility management in Fixzit",
        ),
        category: t(
          "helpCenterV2.categories.facilityManagement",
          "Facility Management",
        ),
        duration: t("helpCenterV2.tutorials.gettingStarted.duration", "15 min"),
        difficulty: "Beginner",
        featured: true,
        completed: false,
        href: "/help/tutorial/getting-started",
      },
      {
        id: "first-work-order",
        title: t(
          "helpCenterV2.tutorials.firstWorkOrder.title",
          "Creating Your First Work Order",
        ),
        description: t(
          "helpCenterV2.tutorials.firstWorkOrder.description",
          "Step-by-step guide to create and assign work orders",
        ),
        category: t("helpCenterV2.categories.workOrders", "Work Orders"),
        duration: t("helpCenterV2.tutorials.firstWorkOrder.duration", "10 min"),
        difficulty: "Beginner",
        href: "/help/tutorial/first-work-order",
      },
      {
        id: "vendor-management",
        title: t(
          "helpCenterV2.tutorials.vendorManagement.title",
          "Vendor Management Best Practices",
        ),
        description: t(
          "helpCenterV2.tutorials.vendorManagement.description",
          "Learn how to manage vendors and procurement processes",
        ),
        category: t("helpCenterV2.categories.procurement", "Procurement"),
        duration: t(
          "helpCenterV2.tutorials.vendorManagement.duration",
          "20 min",
        ),
        difficulty: "Intermediate",
        href: "/help/tutorial/vendor-management",
      },
      {
        id: "tenant-relations",
        title: t(
          "helpCenterV2.tutorials.tenantRelations.title",
          "Tenant Relations & Communication",
        ),
        description: t(
          "helpCenterV2.tutorials.tenantRelations.description",
          "Master tenant communication and relationship management",
        ),
        category: t(
          "helpCenterV2.categories.customerService",
          "Customer Service",
        ),
        duration: t(
          "helpCenterV2.tutorials.tenantRelations.duration",
          "12 min",
        ),
        difficulty: "Beginner",
        href: "/help/tutorial/tenant-relations",
      },
      {
        id: "financial-reporting",
        title: t(
          "helpCenterV2.tutorials.financialReporting.title",
          "Financial Reporting & Invoicing",
        ),
        description: t(
          "helpCenterV2.tutorials.financialReporting.description",
          "Complete guide to financial management in Fixzit",
        ),
        category: t("helpCenterV2.categories.finance", "Finance"),
        duration: t(
          "helpCenterV2.tutorials.financialReporting.duration",
          "25 min",
        ),
        difficulty: "Intermediate",
        href: "/help/tutorial/financial-reporting",
      },
    ],
    [t],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadArticles = async () => {
      try {
        setHasArticleError(false);
        const response = await fetch("/api/help/articles", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const items: HelpArticle[] = Array.isArray(payload?.items)
          ? payload.items.map(
              (
                item: Partial<HelpArticle> & { updated_at?: string },
                idx: number,
              ) => ({
                slug: item.slug || `article-${idx + 1}`,
                title: item.title || strings.untitledArticle,
                category: item.category || undefined,
                updatedAt: item.updatedAt || item.updated_at,
              }),
            )
          : [];

        if (!active) return;
        setArticles(items);
      } catch (error) {
        if (controller.signal.aborted) return;
        logger.warn("[Help] Failed to load articles", { error });
        if (!active) return;
        setHasArticleError(true);
        setArticles([]);
      } finally {
        if (active) {
          setIsLoadingArticles(false);
        }
      }
    };

    loadArticles();

    return () => {
      active = false;
      controller.abort();
    };
  }, [strings.untitledArticle]);

  const openInNewTab = (path: string) => {
    if (typeof window === "undefined") return;
    window.open(path, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <section className="bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <h1 className="text-4xl font-bold mb-4">{strings.title}</h1>
          <p className="text-xl opacity-90 mb-8">{strings.subtitle}</p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => openInNewTab("/help/ai-chat")}
              className="bg-card text-primary px-6 py-3 rounded-2xl font-semibold hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              {strings.askAi}
            </button>
            <button
              type="button"
              onClick={() => openInNewTab("/help/support-ticket")}
              className="bg-accent text-foreground px-6 py-3 rounded-2xl font-semibold hover:bg-accent-dark transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {strings.createTicket}
            </button>
            <Link
              href="/support/my-tickets"
              className="bg-white/10 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
            >
              <MessageSquare className="w-5 h-5" />
              {strings.viewTickets}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {strings.interactiveTitle}
            </h2>
            <p className="text-xl text-muted-foreground">
              {strings.interactiveSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="bg-card rounded-2xl shadow-md border border-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(tutorial.category)}
                      <span className="text-sm text-muted-foreground">
                        {tutorial.category}
                      </span>
                      {tutorial.featured && (
                        <Star className="w-4 h-4 text-accent" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {tutorial.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {tutorial.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                        tutorial.difficulty,
                        t,
                      )}`}
                    >
                      {tutorial.difficulty}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInNewTab(tutorial.href)}
                    className="text-primary hover:text-primary font-medium text-sm flex items-center gap-1"
                  >
                    {t("helpCenter.startTutorial")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: tutorial.completed ? "100%" : "0%" }}
                  />
                </div>
                {tutorial.completed && (
                  <div className="mt-2 text-success text-sm font-medium">
                    ✓ {t("helpCenter.completed")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/help/tutorials"
              className="inline-block bg-muted text-foreground px-6 py-3 rounded-2xl font-medium hover:bg-muted transition-colors"
            >
              {strings.viewAllTutorials}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {strings.helpArticles}
            </h2>
            <p className="text-xl text-muted-foreground">
              {strings.articlesSubtitle}
            </p>
          </div>

          {isLoadingArticles ? (
            <p className="text-center text-muted-foreground">
              {strings.loadingArticles}
            </p>
          ) : !articles.length ? (
            <p className="text-center text-muted-foreground">
              {strings.emptyArticles}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => {
                const category = article.category || strings.generalCategory;
                const updated = formatUpdatedDate(article.updatedAt);
                return (
                  <div
                    key={article.slug || article.title}
                    className="bg-card rounded-2xl shadow-md border border-border p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-2">
                            <span>{category}</span>
                            {updated ? (
                              <span aria-label="updated-at">
                                • {strings.updated} {updated}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {strings.articlesSubtitle}
                          </span>
                          <Link
                            href={`/help/${article.slug}`}
                            className="text-primary hover:text-primary font-medium text-sm flex items-center gap-1"
                          >
                            {strings.readMore}
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasArticleError && !isLoadingArticles ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t(
                "helpCenterV2.fallbackNotice",
                "Unable to load the latest articles right now.",
              )}
            </p>
          ) : null}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {strings.systemOverview}
            </h2>
            <p className="text-xl text-muted-foreground">
              {strings.overviewSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {strings.propertiesTitle}
              </h3>
              <p className="text-muted-foreground text-sm">
                {strings.propertiesCopy}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {strings.workOrdersTitle}
              </h3>
              <p className="text-muted-foreground text-sm">
                {strings.workOrdersCopy}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {strings.vendorsTitle}
              </h3>
              <p className="text-muted-foreground text-sm">
                {strings.vendorsCopy}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {strings.financeTitle}
              </h3>
              <p className="text-muted-foreground text-sm">
                {strings.financeCopy}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
