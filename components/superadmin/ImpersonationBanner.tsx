/**
 * Impersonation Banner Component
 * Displays when superadmin is viewing tenant modules in impersonation context
 */

"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Check if impersonation context is active
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/superadmin/impersonate/status");
        if (response.ok) {
          const data = await response.json();
          setImpersonatedOrgId(data.orgId || null);
        }
      } catch {
        // Silently fail - impersonation banner simply won't show
      }
    };

    checkImpersonation();
  }, []);

  const handleClearImpersonation = async () => {
    setIsClearing(true);
    try {
      const response = await fetch("/api/superadmin/impersonate", {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.href = "/superadmin/issues";
      } else {
        alert("Failed to clear impersonation. Please try again.");
      }
    } catch {
      alert("Failed to clear impersonation. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  if (!impersonatedOrgId) {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">
            <strong>Impersonation Mode:</strong> Viewing as organization{" "}
            <code className="bg-yellow-600/20 px-2 py-0.5 rounded font-mono text-xs">
              {impersonatedOrgId}
            </code>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearImpersonation}
          disabled={isClearing}
          className="text-yellow-900 hover:bg-yellow-600/20"
        >
          {isClearing ? (
            "Clearing..."
          ) : (
            <>
              <X className="w-4 h-4 me-1" />
              Exit
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
