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
    logger.error("Test page error caught", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Test Page Error</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message || "An error occurred on this test page. Please try again."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="w-4 h-4 me-2" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Home className="w-4 h-4 me-2" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
