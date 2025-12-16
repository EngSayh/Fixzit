import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

/**
 * Custom 404 page for help articles that don't exist or are not published.
 *
 * Provides links to browse all help articles or return to the help center homepage.
 *
 * @returns JSX for the help article not found page.
 */
export default function HelpArticleNotFound() {
  const auto = useAutoTranslator("help.articleNotFound");
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-muted rounded-full">
            <FileQuestion className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">
          {auto("Article Not Found", "title")}
        </h1>

        <p className="text-muted-foreground mb-8">
          {auto(
            "The help article you're looking for doesn't exist or is no longer available.",
            "description",
          )}
        </p>

        <div className="space-y-3">
          <Link
            href="/help"
            className="block w-full bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors"
          >
            {auto("Browse All Help Articles", "actions.browse")}
          </Link>

          <Link
            href="/"
            className="block w-full border border-border text-foreground px-6 py-3 rounded-2xl font-medium hover:bg-muted transition-colors"
          >
            {auto("Return to Homepage", "actions.home")}
          </Link>

          <Link
            href="/support/my-tickets"
            className="block w-full text-primary hover:text-primary/80 font-medium pt-2"
          >
            {auto("Contact Support", "actions.support")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
