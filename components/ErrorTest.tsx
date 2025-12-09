'use client';
"use client";

import { useEffect, useState } from "react";

const QA_FLAG_KEY = "fxz.qa-tools";
const ALLOWED_QA_ROLES = ["SUPER_ADMIN", "QA", "DEVELOPER", "ADMIN"];

export default function ErrorTest() {
  const [showTest, setShowTest] = useState(false);
  const [qaEnabled, setQaEnabled] = useState(false);
  const [roleAuthorized, setRoleAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Check user role authorization
    const checkRoleAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const userRole = data.role;
          if (ALLOWED_QA_ROLES.includes(userRole)) {
            setRoleAuthorized(true);
          }
        }
      } catch {
        // Unable to verify user role for QA tools
      } finally {
        setIsLoading(false);
      }
    };

    checkRoleAuth();

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("qa") === "1") {
        localStorage.setItem(QA_FLAG_KEY, "enabled");
        setQaEnabled(true);
        return;
      }

      if (localStorage.getItem(QA_FLAG_KEY) === "enabled") {
        setQaEnabled(true);
      }
    } catch {
      // Unable to initialize QA error test tools
    }
  }, []);

  // Only show QA tools if both enabled AND user has authorized role
  if (isLoading) {
    return null; // Or a loading spinner if you prefer
  }

  if (!qaEnabled || !roleAuthorized) {
    return null;
  }

  const triggerError = () => {
    // This will trigger the error boundary
    throw new Error("Test error triggered by user for error boundary testing");
  };

  const triggerAsyncError = async () => {
    // Simulate an async error
    await new Promise((resolve) => setTimeout(resolve, 1000));
    throw new Error("Async test error triggered by user");
  };

  const triggerJSONError = () => {
    // Simulate JSON parsing error
    JSON.parse("{invalid json}");
  };

  const triggerNetworkError = () => {
    // Simulate network error
    fetch("https://invalid-url-that-does-not-exist.com/api/test");
  };

  if (!showTest) {
    return (
      <button
        onClick={() => setShowTest(true)}
        className="fixed bottom-20 end-6 bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl shadow-lg hover:bg-destructive/90 z-50"
      >
        🧪 Test Error Boundary
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 end-6 bg-card border border-border rounded-2xl shadow-lg p-4 z-50 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-foreground">🧪 Error Testing</h3>
        <button
          onClick={() => setShowTest(false)}
          className="text-muted-foreground hover:text-muted-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={triggerError}
          className="w-full bg-destructive text-destructive-foreground px-3 py-2 rounded text-sm hover:bg-destructive/90"
        >
          🔴 Runtime Error
        </button>

        <button
          onClick={triggerAsyncError}
          className="w-full bg-warning text-warning-foreground px-3 py-2 rounded text-sm hover:bg-warning/90"
        >
          🟠 Async Error
        </button>

        <button
          onClick={triggerJSONError}
          className="w-full bg-secondary text-secondary-foreground px-3 py-2 rounded text-sm hover:bg-secondary/90"
        >
          🟡 JSON Parse Error
        </button>

        <button
          onClick={triggerNetworkError}
          className="w-full bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:bg-primary/90"
        >
          🔵 Network Error
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>Click any button above to test the enhanced error boundary with:</p>
        <ul className="mt-1 space-y-1">
          <li>• Error ID generation</li>
          <li>• Copy to clipboard functionality</li>
          <li>• Automatic support ticket creation</li>
          <li>• Welcome email for guests</li>
        </ul>
      </div>
    </div>
  );
}
