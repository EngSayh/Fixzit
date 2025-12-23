"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home } from "@/components/ui/icons";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
import { Config } from "@/lib/config/constants";
import { logger } from "@/lib/logger";

/**
 * Global Error Boundary Component
 *
 * This component handles errors that occur in the root layout.
 * It must NOT use any context providers (they may have failed).
 *
 * STRICT v4 COMPLIANCE:
 * - Uses inline styles (no Tailwind, contexts may have failed)
 * - Provides recovery via full page reload
 * - Logs errors to console for debugging
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[GlobalError] Critical application error", error, {
      component: "GlobalError",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#f8f9fa",
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            padding: "24px",
            textAlign: "center",
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 24px",
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertOctagon
              style={{ width: "40px", height: "40px", color: "#dc2626" }}
            />
          </div>

          {/* Error Content */}
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#1a1a1a",
            }}
          >
            Critical Error
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}
          >
            A critical error occurred that prevented the application from
            loading. Please try refreshing the page.
          </p>

          {/* Development Error Details */}
          {Config.env.isDevelopment && (
            <div
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.05)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  fontFamily: "monospace",
                  color: "#dc2626",
                  wordBreak: "break-all",
                  margin: 0,
                }}
              >
                {error.message}
              </p>
              {error.digest && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "8px 0 0 0",
                  }}
                >
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Recovery Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button type="button"
              onClick={reset}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "12px 24px",
                backgroundColor: "#25935F", /* Ejar primary-500 */
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              <RefreshCw style={{ width: "16px", height: "16px" }} />
              Try Again
            </button>

            <button type="button"
              onClick={() => (window.location.href = "/")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "12px 24px",
                backgroundColor: "transparent",
                color: "#1a1a1a",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              <Home style={{ width: "16px", height: "16px" }} />
              Go to Homepage
            </button>
          </div>

          {/* Support Link */}
          <p
            style={{
              marginTop: "32px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            If this problem persists,{" "}
            <a
              href={`mailto:${EMAIL_DOMAINS.support}`}
              style={{ color: "#25935F", textDecoration: "none" }} /* Ejar primary-500 */
            >
              contact support
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
