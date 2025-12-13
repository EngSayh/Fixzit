// AutoFixManager for system health monitoring - MongoDB only
import { logger } from "@/lib/logger";
import { STORAGE_KEYS } from "@/config/constants";

export interface SystemCheck {
  id: string;
  name: string;
  description: string;
  check: () => Promise<boolean>;
  fix?: () => Promise<boolean>;
  priority: "critical" | "high" | "medium" | "low";
  category: "api" | "database" | "component" | "network" | "auth" | "ui";
  /** If true, skip this check when user is not authenticated (avoids 401/403 console noise) */
  requiresAuth?: boolean;
  /** If true, skip this check when user is not a super admin */
  requiresSuperAdmin?: boolean;
}

export interface FixResult {
  checkId: string;
  success: boolean;
  error?: string;
  fixApplied?: boolean;
  timestamp: string;
  duration: number;
}

export class AutoFixManager {
  private checks: SystemCheck[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private isAuthenticated = false;
  private isSuperAdmin = false;

  constructor() {
    this.initializeChecks();
  }

  /** Update auth state to control which checks run */
  public setAuthState(authenticated: boolean, superAdmin: boolean = false): void {
    this.isAuthenticated = authenticated;
    this.isSuperAdmin = superAdmin;
  }

  private initializeChecks(): void {
    this.checks = [
      // Critical API endpoints
      {
        id: "api-auth-me",
        name: "Authentication API",
        description: "Check auth/me endpoint",
        category: "api",
        priority: "critical",
        check: async () => {
          try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            return res.ok || res.status === 401; // 401 is acceptable for unauthenticated
          } catch {
            return false;
          }
        },
        fix: async () => {
          // Clear auth cache and retry
          if (typeof window !== "undefined") {
            localStorage.removeItem("fxz.auth");
            localStorage.removeItem("fxz.user");
          }
          return true;
        },
      },

      {
        id: "api-help-articles",
        name: "Help Articles API",
        description: "Check help/articles endpoint",
        category: "api",
        priority: "high",
        requiresAuth: true, // Endpoint requires authentication
        check: async () => {
          try {
            const res = await fetch("/api/help/articles");
            // 401 is acceptable for unauthenticated users
            return res.ok || res.status === 401;
          } catch {
            return false;
          }
        },
        fix: async () => {
          // Clear any cached help data
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("fxz.help.cache");
          }
          return true;
        },
      },

      {
        id: "api-notifications",
        name: "Notifications API",
        description: "Check notifications endpoint",
        category: "api",
        priority: "high",
        requiresAuth: true, // Endpoint requires authentication
        check: async () => {
          try {
            const res = await fetch("/api/notifications");
            // 401 is acceptable for unauthenticated users
            return res.ok || res.status === 401;
          } catch {
            return false;
          }
        },
        fix: async () => {
          // Clear notification cache
          if (typeof window !== "undefined") {
            localStorage.removeItem("fxz.notifications");
          }
          return true;
        },
      },

      // Database connectivity
      {
        id: "database-connection",
        name: "Database Connection",
        description: "Verify database connectivity",
        category: "database",
        priority: "critical",
        requiresSuperAdmin: true, // /api/qa/health requires SUPER_ADMIN
        check: async () => {
          try {
            const res = await fetch("/api/qa/health");
            const data = await res.json();
            return (
              data.database === "connected" ||
              data.database === "mock-connected"
            );
          } catch {
            return false;
          }
        },
        fix: async () => {
          // Force database reconnection
          try {
            await fetch("/api/qa/reconnect", { method: "POST" });
          } catch {
            // Silent fail
          }
          return true;
        },
      },

      // Network connectivity
      {
        id: "network-connectivity",
        name: "Network Connectivity",
        description: "Check internet connectivity",
        category: "network",
        priority: "critical",
        check: async () => {
          return navigator.onLine;
        },
        fix: async () => {
          return new Promise((resolve) => {
            const checkOnline = () => {
              if (navigator.onLine) {
                resolve(true);
              } else {
                setTimeout(checkOnline, 1000);
              }
            };
            setTimeout(checkOnline, 1000);
          });
        },
      },

      // Component loading - disabled to prevent dynamic import issues
      // {
      //   id: 'component-loading',
      //   name: 'Component Loading',
      //   description: 'Verify UI components load correctly',
      //   category: 'component',
      //   priority: 'medium',
      //   check: async () => {
      //     // Skip component loading check
      //     return true;
      //   }
      // },

      // Local storage
      {
        id: "localStorage-access",
        name: "Local Storage Access",
        description: "Check localStorage functionality",
        category: "ui",
        priority: "medium",
        check: async () => {
          if (typeof window === "undefined") return false;
          try {
            const testKey = "fxz.test";
            localStorage.setItem(testKey, "test");
            const value = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            return value === "test";
          } catch {
            return false;
          }
        },
        fix: async () => {
          // Clear corrupted data
          if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
          }
          return true;
        },
      },

      // Session management
      {
        id: "session-management",
        name: "Session Management",
        description: "Check session persistence",
        category: "auth",
        priority: "high",
        check: async () => {
          if (typeof window === "undefined") return true; // Skip on server
          try {
            const authData = localStorage.getItem("fxz.auth");
            if (!authData) return true; // No session is ok

            const auth = JSON.parse(authData);
            return auth.token && auth.expires > Date.now();
          } catch {
            return false;
          }
        },
        fix: async () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("fxz.auth");
            localStorage.removeItem("fxz.user");
            localStorage.setItem("fxz.session.reset", "true");
          }
          return true;
        },
      },
    ];
  }

  public async runHealthCheck(): Promise<FixResult[]> {
    const results: FixResult[] = [];

    for (const check of this.checks) {
      // Skip checks that require authentication if user is not authenticated
      if (check.requiresAuth && !this.isAuthenticated) {
        continue;
      }
      // Skip checks that require super admin if user is not super admin
      if (check.requiresSuperAdmin && !this.isSuperAdmin) {
        continue;
      }

      const startTime = Date.now();

      try {
        const isHealthy = await check.check();
        const duration = Date.now() - startTime;

        if (!isHealthy) {
          let fixApplied = false;
          let fixError: string | undefined;
          if (check.fix) {
            try {
              fixApplied = await check.fix();
            } catch (err) {
              // Capture fix failure for diagnostics
              const errorMsg = err instanceof Error ? err.message : String(err);
              fixError = `Fix attempt failed: ${errorMsg}`;

              // Log for development/debugging (not in production)
              if (process.env.NODE_ENV !== "production") {
                logger.debug(`[AutoFix] ${check.id} fix failed:`, err);
              }
            }
          }

          results.push({
            checkId: check.id,
            success: false,
            error: fixError || `${check.name} check failed`,
            fixApplied,
            timestamp: new Date().toISOString(),
            duration,
          });
        } else {
          results.push({
            checkId: check.id,
            success: true,
            timestamp: new Date().toISOString(),
            duration,
          });
        }
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        const duration = Date.now() - startTime;
        results.push({
          checkId: check.id,
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          duration,
        });
      }
    }

    return results;
  }

  public startAutoMonitoring(intervalMinutes: number = 5): void {
    if (this.isRunning) return;
    if (typeof window === "undefined") return;

    this.isRunning = true;

    this.intervalId = setInterval(
      async () => {
        const results = await this.runHealthCheck();

        // Log results
        const failedCount = results.filter((r) => !r.success).length;
        if (failedCount > 0) {
          // Send alert to QA system
          this.sendAlert(results);
        }
      },
      intervalMinutes * 60 * 1000,
    );
  }

  public stopAutoMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
    }
  }

  private async sendAlert(results: FixResult[]): Promise<void> {
    // Only send alerts if user is authenticated as super admin
    if (!this.isSuperAdmin) {
      return;
    }

    try {
      await fetch("/api/qa/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "SYSTEM_HEALTH_ISSUE",
          data: {
            results,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
        }),
      });
    } catch {
      // Silent fail for alerts
    }
  }

  public async verifySystemHealth(): Promise<{
    overall: "healthy" | "degraded" | "critical";
    issues: string[];
    fixes: string[];
  }> {
    const results = await this.runHealthCheck();
    const failedResults = results.filter((r) => !r.success);
    const criticalFailures = failedResults.filter(
      (r) =>
        this.checks.find((c) => c.id === r.checkId)?.priority === "critical",
    );

    const issues = failedResults.map(
      (r) => `${r.checkId}: ${r.error}${r.fixApplied ? " (fix applied)" : ""}`,
    );

    const fixes = results
      .filter((r) => r.fixApplied)
      .map((r) => `Fixed: ${r.checkId}`);

    let overall: "healthy" | "degraded" | "critical" = "healthy";
    if (criticalFailures.length > 0) {
      overall = "critical";
    } else if (failedResults.length > 0) {
      overall = "degraded";
    }

    return { overall, issues, fixes };
  }

  // Emergency recovery
  public async emergencyRecovery(): Promise<void> {
    if (typeof window !== "undefined") {
      // Clear all caches
      localStorage.clear();
      sessionStorage.clear();

      // Reset application state
      const keysToKeep: string[] = [STORAGE_KEYS.language, STORAGE_KEYS.theme];
      Object.keys(localStorage).forEach((key) => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Force reload after cleanup
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }
}

// Global instance
export const autoFixManager = new AutoFixManager();
