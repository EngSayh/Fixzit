import { nanoid } from 'nanoid';
import { isMockDB } from './mongo';

export interface SystemCheck {
  id: string;
  name: string;
  description: string;
  check: () => Promise<boolean>;
  fix?: () => Promise<boolean>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'api' | 'database' | 'component' | 'network' | 'auth' | 'ui';
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

  constructor() {
    this.initializeChecks();
    this.startAutoMonitoring();
  }

  private initializeChecks(): void {
    this.checks = [
      // Critical API endpoints
      {
        id: 'api-auth-me',
        name: 'Authentication API',
        description: 'Check auth/me endpoint',
        category: 'api',
        priority: 'critical',
        check: async () => {
          try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            return res.ok || res.status === 401; // 401 is acceptable for unauthenticated
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing auth API...');
          // Clear auth cache and retry
          if (typeof window !== 'undefined') {
            localStorage.removeItem('fxz.auth');
            localStorage.removeItem('fxz.user');
          }
          return true;
        }
      },

      {
        id: 'api-help-articles',
        name: 'Help Articles API',
        description: 'Check help/articles endpoint',
        category: 'api',
        priority: 'high',
        check: async () => {
          try {
            const res = await fetch('/api/help/articles');
            return res.ok;
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing help API...');
          // Clear any cached help data
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('fxz.help.cache');
          }
          return true;
        }
      },

      {
        id: 'api-notifications',
        name: 'Notifications API',
        description: 'Check notifications endpoint',
        category: 'api',
        priority: 'high',
        check: async () => {
          try {
            const res = await fetch('/api/notifications');
            return res.ok;
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing notifications API...');
          // Clear notification cache
          if (typeof window !== 'undefined') {
            localStorage.removeItem('fxz.notifications');
          }
          return true;
        }
      },

      // Database connectivity
      {
        id: 'database-connection',
        name: 'Database Connection',
        description: 'Verify database connectivity',
        category: 'database',
        priority: 'critical',
        check: async () => {
          try {
            const res = await fetch('/api/qa/health');
            const data = await res.json();
            return data.database === 'connected' || data.database === 'mock-connected';
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing database connection...');
          // Force database reconnection
          if (!isMockDB) {
            await fetch('/api/qa/reconnect', { method: 'POST' });
          }
          return true;
        }
      },

      // Network connectivity
      {
        id: 'network-connectivity',
        name: 'Network Connectivity',
        description: 'Check internet connectivity',
        category: 'network',
        priority: 'critical',
        check: async () => {
          return navigator.onLine;
        },
        fix: async () => {
          console.log('🔧 Network offline - waiting for connection...');
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
        }
      },

      // Component loading
      {
        id: 'component-loading',
        name: 'Component Loading',
        description: 'Verify UI components load correctly',
        category: 'component',
        priority: 'medium',
        check: async () => {
          try {
            // Test if key components are available
            const testComponents = ['ErrorBoundary', 'HelpWidget', 'TopBar'];
            return testComponents.every(name => {
              try {
                require(`@/src/components/${name}`);
                return true;
              } catch {
                return false;
              }
            });
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing component loading...');
          // Clear component cache and reload
          window.location.reload();
          return true;
        }
      },

      // Local storage
      {
        id: 'localStorage-access',
        name: 'Local Storage Access',
        description: 'Check localStorage functionality',
        category: 'ui',
        priority: 'medium',
        check: async () => {
          if (typeof window === 'undefined') return false;
          try {
            const testKey = 'fxz.test';
            localStorage.setItem(testKey, 'test');
            const value = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            return value === 'test';
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing localStorage...');
          // Clear corrupted data
          if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
          }
          return true;
        }
      },

      // Session management
      {
        id: 'session-management',
        name: 'Session Management',
        description: 'Check session persistence',
        category: 'auth',
        priority: 'high',
        check: async () => {
          if (typeof window === 'undefined') return true; // Skip on server
          try {
            const authData = localStorage.getItem('fxz.auth');
            if (!authData) return true; // No session is ok

            const auth = JSON.parse(authData);
            return auth.token && auth.expires > Date.now();
          } catch {
            return false;
          }
        },
        fix: async () => {
          console.log('🔧 Fixing session management...');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('fxz.auth');
            localStorage.removeItem('fxz.user');
            localStorage.setItem('fxz.session.reset', 'true');
          }
          return true;
        }
      }
    ];
  }

  public async runHealthCheck(): Promise<FixResult[]> {
    const results: FixResult[] = [];

    for (const check of this.checks) {
      const startTime = Date.now();

      try {
        const isHealthy = await check.check();
        const duration = Date.now() - startTime;

        if (!isHealthy) {
          console.log(`❌ ${check.name} failed, attempting fix...`);

          let fixApplied = false;
          if (check.fix) {
            try {
              fixApplied = await check.fix();
            } catch (fixError) {
              console.error(`❌ Fix failed for ${check.name}:`, fixError);
            }
          }

          results.push({
            checkId: check.id,
            success: false,
            error: `${check.name} check failed`,
            fixApplied,
            timestamp: new Date().toISOString(),
            duration
          });
        } else {
          results.push({
            checkId: check.id,
            success: true,
            timestamp: new Date().toISOString(),
            duration
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          checkId: check.id,
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          duration
        });
      }
    }

    return results;
  }

  public startAutoMonitoring(intervalMinutes: number = 5): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🤖 Auto-fix monitoring started');

    this.intervalId = setInterval(async () => {
      const results = await this.runHealthCheck();

      // Log results
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} health checks failed, auto-fixes applied`);

        // Send alert to QA system
        this.sendAlert(results);
      }
    }, intervalMinutes * 60 * 1000);
  }

  public stopAutoMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('⏹️ Auto-fix monitoring stopped');
    }
  }

  private async sendAlert(results: FixResult[]): Promise<void> {
    try {
      await fetch('/api/qa/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'SYSTEM_HEALTH_ISSUE',
          data: {
            results,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        })
      });
    } catch {
      // Silent fail for alerts
    }
  }

  public async verifySystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    fixes: string[];
  }> {
    const results = await this.runHealthCheck();
    const failedResults = results.filter(r => !r.success);
    const criticalFailures = failedResults.filter(r =>
      this.checks.find(c => c.id === r.checkId)?.priority === 'critical'
    );

    const issues = failedResults.map(r =>
      `${r.checkId}: ${r.error}${r.fixApplied ? ' (fix applied)' : ''}`
    );

    const fixes = results
      .filter(r => r.fixApplied)
      .map(r => `Fixed: ${r.checkId}`);

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalFailures.length > 0) {
      overall = 'critical';
    } else if (failedResults.length > 0) {
      overall = 'degraded';
    }

    return { overall, issues, fixes };
  }

  // Emergency recovery
  public async emergencyRecovery(): Promise<void> {
    console.log('🚨 Emergency recovery initiated');

    if (typeof window !== 'undefined') {
      // Clear all caches
      localStorage.clear();
      sessionStorage.clear();

      // Reset application state
      const keysToKeep = ['fxz.lang', 'fxz.theme'];
      Object.keys(localStorage).forEach(key => {
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
