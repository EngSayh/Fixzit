import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function JobNotFound() {
  const { t } = await getServerI18n();
  return (
    <div className="min-h-screen bg-card flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t("careers.notFound.title", "Job Not Found")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t(
            "careers.notFound.description",
            "This job posting may have been closed, removed, or the link may be invalid.",
          )}
        </p>

        <div className="space-y-3">
          <Link
            href="/careers"
            className="inline-block w-full px-6 py-3 bg-primary text-primary-foreground rounded-2xl 
                     hover:bg-primary/90 transition-colors font-semibold
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {t("careers.notFound.viewAll", "View All Open Positions")}
          </Link>

          <Link
            href="/"
            className="inline-block w-full px-6 py-3 border border-border text-foreground 
                     rounded-2xl hover:bg-muted transition-colors font-semibold
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {t("careers.notFound.goHome", "Go to Homepage")}
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          {t(
            "careers.notFound.footerPrompt",
            "Looking for something specific?",
          )}{" "}
          <Link
            href="/support"
            className="text-primary hover:text-primary underline"
          >
            {t("careers.notFound.contact", "Contact our HR team")}
          </Link>
        </p>
      </div>
    </div>
  );
}
