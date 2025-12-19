/**
 * Superadmin Impersonation Page
 * Allows superadmin to select an organization for impersonation context
 * Sets support_org_id cookie for tenant module access
 */

import { getSuperadminSessionFromCookies } from "@/lib/superadmin/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ImpersonationForm } from "@/components/superadmin/ImpersonationForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impersonate Organization | Fixzit Superadmin",
  robots: "noindex, nofollow",
};

interface PageProps {
  searchParams: { next?: string };
}

export default async function ImpersonatePage({ searchParams }: PageProps) {
  // Server-side auth check
  const session = await getSuperadminSessionFromCookies();
  if (!session || !session.username) {
    redirect("/superadmin/login");
  }

  const nextUrl = searchParams.next || "/superadmin/issues";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Organization Impersonation
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select an organization to access tenant modules (FM, Finance, HR, etc.)
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Impersonation Context Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Superadmin access requires organization context to view tenant modules. 
                  Your actions will be logged for audit purposes.
                </p>
              </div>
            </div>
          </div>

          <ImpersonationForm nextUrl={nextUrl} />

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Available After Impersonation:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Facility Management", icon: "🏢" },
                { name: "Work Orders", icon: "🔧" },
                { name: "Properties", icon: "🏠" },
                { name: "Finance", icon: "💰" },
                { name: "HR", icon: "👥" },
                { name: "System Settings", icon: "⚙️" },
              ].map((module) => (
                <div
                  key={module.name}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="text-lg">{module.icon}</span>
                  <span>{module.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/superadmin/issues"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Issues
            </Link>
            <span className="text-gray-500 dark:text-gray-400">
              Logged in as: <strong>{session.username}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
