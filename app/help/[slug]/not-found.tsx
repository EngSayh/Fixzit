import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

/**
 * Custom 404 page for help articles that don't exist or are not published.
 *
 * Provides links to browse all help articles or return to the help center homepage.
 *
 * @returns JSX for the help article not found page.
 */
export default function HelpArticleNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gray-100 rounded-full">
            <FileQuestion className="w-16 h-16 text-gray-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Article Not Found
        </h1>
        
        <p className="text-gray-600 mb-8">
          The help article you're looking for doesn't exist or is no longer available.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/help"
            className="block w-full bg-[var(--fixzit-blue)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--fixzit-blue)]/90 transition-colors"
          >
            Browse All Help Articles
          </Link>
          
          <Link
            href="/"
            className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Return to Homepage
          </Link>
          
          <Link
            href="/support/my-tickets"
            className="block w-full text-[var(--fixzit-blue)] hover:text-[var(--fixzit-blue)]/80 font-medium pt-2"
          >
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
