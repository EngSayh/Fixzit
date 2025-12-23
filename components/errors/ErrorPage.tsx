"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, type LucideIcon } from "@/components/ui/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export interface ErrorPageProps {
  /** The error object from Next.js error boundary */
  error: Error & { digest?: string };
  /** Function to reset the error boundary and retry */
  reset: () => void;
  /** Module name for logging context */
  moduleName?: string;
  /** Custom title (default: "Something went wrong") */
  title?: string;
  /** Custom description (default: error.message or generic message) */
  description?: string;
  /** Custom icon component (default: AlertTriangle) */
  Icon?: LucideIcon;
  /** Home link destination (default: /dashboard) */
  homeHref?: string;
  /** Additional action buttons */
  extraActions?: ReactNode;
}

/**
 * Shared Error Page Component
 *
 * RTL-safe error boundary UI component. Uses logical direction classes (me-2, ms-2)
 * instead of physical direction classes (mr-2, ml-2) for proper RTL support.
 *
 * @example
 * ```tsx
 * // In app/my-module/error.tsx
 * export default function Error({ error, reset }: { error: Error; reset: () => void }) {
 *   return <ErrorPage error={error} reset={reset} moduleName="my-module" />;
 * }
 * ```
 */
export function ErrorPage({
  error,
  reset,
  moduleName = "application",
  title = "Something went wrong",
  description,
  Icon = AlertTriangle,
  homeHref = "/dashboard",
  extraActions,
}: ErrorPageProps) {
  useEffect(() => {
    logger.error(`${moduleName} module error caught`, {
      message: error.message,
      digest: error.digest,
      module: moduleName,
    });
  }, [error, moduleName]);

  const errorDescription =
    description ||
    error.message ||
    `An unexpected error occurred in the ${moduleName} module. Please try again.`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <Icon className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{errorDescription}</p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          {/* RTL-safe: use me-2 (margin-end) instead of mr-2 */}
          <RefreshCw className="w-4 h-4 me-2" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <Link href={homeHref}>
            {/* RTL-safe: use me-2 (margin-end) instead of mr-2 */}
            <Home className="w-4 h-4 me-2" />
            Go Home
          </Link>
        </Button>
        {extraActions}
      </div>
    </div>
  );
}

export default ErrorPage;
