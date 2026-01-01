"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "@/components/ui/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("CMS module error caught", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message || "An unexpected error occurred in the CMS. Please try again."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" aria-label="Retry loading CMS" title="Retry loading CMS">
          <RefreshCw className="w-4 h-4 me-2" />
          Try Again
        </Button>
        <Button asChild variant="outline" aria-label="Go to home page" title="Go to home page">
          <Link href="/dashboard">
            <Home className="w-4 h-4 me-2" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
