'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { STORAGE_KEYS } from '@/config/constants';

const SupportPopup = dynamic(() => import('@/components/SupportPopup'), { ssr: false });

// Chrome-specific Performance.memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

type ErrorReport = {
  errorId: string;
  timestamp: string;
  url: string;
  userAgent: string;
  viewport: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    componentStack?: string;
  };
  system: {
    language: string;
    platform: string;
    onLine: boolean;
    memory?: {
      used: number;
      total: number;
      limit: number;
    } | null;
  };
  localStorage: {
    hasAuth: boolean;
    hasUser: boolean;
    hasLang: boolean;
    hasTheme: boolean;
  };
};

type ErrorState = {
  hasError: boolean;
  msg?: string;
  errorType?: string;
  fixAttempted?: boolean;
  fixSuccessful?: boolean;
  retryCount?: number;
  errorReport?: ErrorReport;
  errorId?: string;
  ticketCreated?: boolean;
  ticketId?: string;
  showSupport?: boolean;
};

type ErrorFix = {
  pattern: RegExp;
  type: string;
  autoFix: (error: Error) => Promise<boolean>;
  fallback: () => void;
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorState> {
  state: ErrorState = { hasError: false, retryCount: 0 };

  // Auto-fix strategies
  private errorFixes: ErrorFix[] = [
    // JSON parsing errors
    {
      pattern: /Failed to execute 'json' on 'Response'/,
      type: 'JSON_PARSE_ERROR',
      autoFix: async (_error: Error) => {
        // Clear localStorage cache that might be corrupted
        // Note: Aggressive approach - clears all storage to ensure clean state
        // Alternative: Could implement targeted clearing based on error context
        try {
          localStorage.clear();
          sessionStorage.clear();

          // Force page reload to reset state
          window.location.reload();
          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        this.forceRefresh();
      }
    },

    // Module not found errors
    {
      pattern: /Module not found|Can't resolve/,
      type: 'MODULE_NOT_FOUND',
      autoFix: async (_error: Error) => {
        // Try to clear module cache
        try {
          if (typeof window !== 'undefined') {
            // Clear any cached imports
            Object.keys(window).forEach(key => {
              if (key.startsWith('__webpack') || key.startsWith('__next')) {
                delete (window as unknown as Record<string, unknown>)[key];
              }
            });

            // Force refresh
            window.location.reload();
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      fallback: () => {
        this.showErrorMessage('Module loading failed. Please refresh the page.');
      }
    },

    // Network errors
    {
      pattern: /fetch.*failed|Network request failed/,
      type: 'NETWORK_ERROR',
      autoFix: async (_error: Error) => {
        try {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check if online
          if (!navigator.onLine) {
            this.showErrorMessage('Please check your internet connection.');
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        this.showErrorMessage('Network error. Please check your connection and try again.');
      }
    },

    // Hydration errors
    {
      pattern: /hydration|Hydration failed/,
      type: 'HYDRATION_ERROR',
      autoFix: async (_error: Error) => {
        try {
          // Force client-side rendering mode
          localStorage.setItem('fxz.render', 'client');
          window.location.reload();
          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        this.showErrorMessage('Rendering error. Please refresh the page.');
      }
    },

    // Generic runtime errors
    {
      pattern: /TypeError|ReferenceError/,
      type: 'RUNTIME_ERROR',
      autoFix: async (_error: Error) => {
        try {
          // Clear application state
          localStorage.removeItem('fxz.auth');
          localStorage.removeItem('fxz.user');
          localStorage.removeItem('fxz.state');

          // Attempt recovery
          setTimeout(() => {
            window.location.reload();
          }, 1000);

          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        this.showErrorMessage('Application error. Please refresh and try again.');
      }
    }
  ];

  static getDerivedStateFromError(error: unknown): Partial<ErrorState> {
    const err = error as Error;
    return {
      hasError: true,
      msg: err?.message,
      errorType: err?.name || 'Unknown'
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const err = error as Error;

    // Generate comprehensive error report
    const errorReport = this.generateErrorReport(err, errorInfo);

    // Store error report in state
    this.setState({
      errorReport,
      errorId: errorReport.errorId
    });

    // Log error to QA system
    this.logErrorToQA(errorReport);

    // Attempt auto-fix
    this.attemptAutoFix(err);

    // Also auto-report an incident so Support gets a ticket without user action
    try {
      const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.user) : null;
      const user = userStr ? JSON.parse(userStr) : null;
      const truncate = (s?: string, n = 4000) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
      const safeUser = user ? { userId: user.id, tenant: user.tenantId } : undefined;
      const payload = {
        code: 'UI-UI-RENDER-001',
        incidentKey: errorReport.errorId,
        message: truncate(errorReport.error.message, 500),
        details: truncate(errorReport.error.stack, 4000),
        userContext: safeUser,
        clientContext: {
          url: errorReport.url,
          userAgent: errorReport.userAgent,
          locale: errorReport.system.language,
          rtl: typeof document !== 'undefined' ? (document.dir === 'rtl') : false,
          time: errorReport.timestamp
        }
      };
      // Prevent duplicate submission if AutoIncidentReporter already sent for this errorId
      if (typeof sessionStorage !== 'undefined') {
        const last = sessionStorage.getItem('fxz_last_incident');
        if (last === errorReport.errorId) return;
        sessionStorage.setItem('fxz_last_incident', errorReport.errorId);
      }
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (!('sendBeacon' in navigator) || !navigator.sendBeacon('/api/support/incidents', blob)) {
        fetch('/api/support/incidents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      }
    } catch {}
  }

  private logErrorToQA = (errorReport: Record<string, unknown>) => {
    fetch('/api/qa/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'ERROR_BOUNDARY_CAUGHT',
        data: errorReport,
        level: 'ERROR',
        source: 'ErrorBoundary',
        category: 'UI_ERROR'
      })
    }).catch(() => {}); // Fire and forget
  };

  private attemptAutoFix = async (error: Error) => {
    for (const fix of this.errorFixes) {
      if (fix.pattern.test(error.message)) {
        try {
          const success = await fix.autoFix(error);

          if (success) {
            this.setState({
              fixAttempted: true,
              fixSuccessful: true
            });

            // Log successful fix
            this.logFixAttempt(fix.type, true, error);
            return;
          }
        } catch (fixError) {
          console.error('❌ Auto-fix failed:', fixError);
        }

        // Apply fallback
        fix.fallback();
        this.setState({ fixAttempted: true, fixSuccessful: false });
        this.logFixAttempt(fix.type, false, error);
        break;
      }
    }
  };

  private logFixAttempt = (fixType: string, success: boolean, error: Error) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      fixType,
      success,
      error: error.message,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to logging API
    fetch('/api/qa/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'AUTO_FIX_ATTEMPT',
        data: logEntry
      })
    }).catch(() => {}); // Fire and forget
  };

  private forceRefresh = () => {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  private showErrorMessage = (message: string) => {
    this.setState({
      msg: message,
      fixAttempted: true,
      fixSuccessful: false
    });
  };

  // Enhanced error indexing and reporting
  private generateErrorReport = (error: Error, errorInfo: React.ErrorInfo) => {
    // Generate unique error ID with browser compatibility fallback
    let errorId: string;
    try {
      // crypto.randomUUID() is supported in modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
      errorId = `ERR-${crypto.randomUUID()}`;
    } catch {
      // Fallback for older browsers: use timestamp + random number
      errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userId: localStorage.getItem(STORAGE_KEYS.user) ? 'Authenticated User' : 'Guest User',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || undefined
      },
      system: {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        // Chrome-specific Performance Memory API (supplementary diagnostic data)
        // Gracefully returns null in non-Chrome browsers
        memory: ('memory' in performance && performance.memory) ? {
          used: (performance.memory as PerformanceMemory).usedJSHeapSize,
          total: (performance.memory as PerformanceMemory).totalJSHeapSize,
          limit: (performance.memory as PerformanceMemory).jsHeapSizeLimit
        } : null
      },
      localStorage: {
        hasAuth: !!localStorage.getItem(STORAGE_KEYS.user),
        hasUser: !!localStorage.getItem('fxz.user'),
        hasLang: !!localStorage.getItem('fxz.lang'),
        hasTheme: !!localStorage.getItem('fxz.theme')
      }
    };

    return errorReport;
  };

  // Copy error details to clipboard
  private copyErrorDetails = (errorReport: ErrorReport) => {
    const errorText = `
🚨 Error Report - ${errorReport.errorId}
📅 Time: ${errorReport.timestamp}
🌐 URL: ${errorReport.url}
📱 User Agent: ${errorReport.userAgent}
🔍 Viewport: ${errorReport.viewport}

❌ Error Details:
  Type: ${errorReport.error.name}
  Message: ${errorReport.error.message}

📊 System Information:
  Language: ${errorReport.system.language}
  Platform: ${errorReport.system.platform}
  Online: ${errorReport.system.onLine}
  ${errorReport.system.memory ? `Memory: ${Math.round(errorReport.system.memory.used / 1024 / 1024)}MB / ${Math.round(errorReport.system.memory.total / 1024 / 1024)}MB` : ''}

🔧 Application State:
  Authenticated: ${errorReport.localStorage.hasAuth}
  User Data: ${errorReport.localStorage.hasUser}
  Language Set: ${errorReport.localStorage.hasLang}
  Theme Set: ${errorReport.localStorage.hasTheme}

📋 Stack Trace:
${errorReport.error.stack || 'No stack trace available'}

📄 Component Stack:
${errorReport.error.componentStack || 'No component stack available'}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      this.showErrorMessage('Error details copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showErrorMessage('Error details copied to clipboard!');
    });
  };

  // Open Support popup for detailed submission (guests provide info; users use session)
  private openSupport = () => {
    this.setState({ showSupport: true });
  };

  // NOTE: _sendWelcomeEmail removed - welcome emails should be handled by auth flow, not error boundary
  // If needed for error-related user onboarding, implement as separate service

  private handleRetry = () => {
    const newRetryCount = (this.state.retryCount || 0) + 1;

    if (newRetryCount >= 3) {
      this.showErrorMessage('Maximum retry attempts reached. Please refresh the page manually.');
      return;
    }

    this.setState({
      hasError: false,
      retryCount: newRetryCount,
      fixAttempted: false
    });
  };

  private handleManualRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Note: CSS variables (--fixzit-*) are defined in app/globals.css
      // Ensure globals.css is imported in root layout
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="max-w-2xl w-full bg-card rounded-2xl shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-[var(--fixzit-danger-lighter)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--fixzit-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              {this.state.fixSuccessful ? 'Auto-Fix Applied' : 'System Error Detected'}
            </h2>

            <p className="text-muted-foreground mb-4">
              {this.state.fixSuccessful
                ? 'The system has automatically fixed the issue and is reloading...'
                : this.state.fixAttempted
                  ? 'Auto-fix attempted but failed. Manual intervention required.'
                  : this.state.msg || 'An unexpected error occurred.'
              }
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="mb-4 p-3 bg-[var(--fixzit-primary-lightest)] rounded-2xl">
                <div className="text-sm text-[var(--fixzit-primary-darker)]">
                  <strong>Error ID:</strong> <code className="bg-[var(--fixzit-primary-lighter)] px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </div>
                <div className="text-xs text-[var(--fixzit-primary)] mt-1">
                  Please include this ID when reporting the issue
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {this.state.fixAttempted && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  this.state.fixSuccessful
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {this.state.fixSuccessful ? '✅ Fixed' : '❌ Fix Failed'}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--fixzit-primary-lighter)] text-[var(--fixzit-primary-darker)]">
                Retry: {this.state.retryCount || 0}/3
              </span>
              {this.state.ticketCreated && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--fixzit-success-lighter)] text-[var(--fixzit-success-darker)]">
                  📝 Support Ticket: {this.state.ticketId}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {this.state.fixSuccessful ? (
                <div className="text-sm text-muted-foreground">
                  🔄 Reloading automatically...
                </div>
              ) : (
                <>
                  <button
                    onClick={this.handleRetry}
                    disabled={(this.state.retryCount || 0) >= 3}
                    className="w-full px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-2xl hover:bg-[var(--fixzit-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Retry ({3 - (this.state.retryCount || 0)} attempts left)
                  </button>

                  <button
                    onClick={this.handleManualRefresh}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-2xl hover:bg-secondary/90"
                  >
                    🔄 Force Refresh
                  </button>

                  {/* Copy Error Details */}
                  {this.state.errorReport && (
                    <button
                      onClick={() => this.state.errorReport && this.copyErrorDetails(this.state.errorReport)}
                      className="w-full px-4 py-2 bg-[var(--fixzit-secondary)] text-white rounded-2xl hover:bg-[var(--fixzit-secondary-dark)]"
                    >
                      📋 Copy Error Details
                    </button>
                  )}

                  {/* Open Support Ticket Dialog */}
                  {this.state.errorReport && !this.state.ticketCreated && (
                    <button
                      onClick={this.openSupport}
                      className="w-full px-4 py-2 bg-[var(--fixzit-success)] text-white rounded-2xl hover:bg-[var(--fixzit-success-dark)]"
                    >
                      📝 Report to Support
                    </button>
                  )}

                  <Link
                    href="/help"
                    className="inline-block w-full px-4 py-2 bg-[var(--fixzit-accent)] text-white rounded-2xl hover:bg-[var(--fixzit-accent-dark)] text-center"
                  >
                    📚 Get Help
                  </Link>
                </>
              )}
            </div>

            {/* Technical Details */}
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                🔍 Technical Details
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto">
                <div><strong>Error:</strong> {this.state.msg}</div>
                <div><strong>Type:</strong> {this.state.errorType}</div>
                <div><strong>Time:</strong> {new Date().toISOString()}</div>
                <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}</div>
                {this.state.errorReport && (
                  <>
                    <div><strong>User Agent:</strong> {this.state.errorReport.userAgent}</div>
                    <div><strong>Viewport:</strong> {this.state.errorReport.viewport}</div>
                    <div><strong>Platform:</strong> {this.state.errorReport.system.platform}</div>
                  </>
                )}
              </div>
            </details>

            {/* Stack Trace */}
            {this.state.errorReport && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  📋 Stack Trace
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                  {this.state.errorReport.error.stack || 'No stack trace available'}
                </div>
              </details>
            )}

            {/* Component Stack */}
            {this.state.errorReport && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  📄 Component Stack
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                  {this.state.errorReport.error.componentStack || 'No component stack available'}
                </div>
              </details>
            )}
          </div>
          {this.state.showSupport && this.state.errorReport && (
            <SupportPopup
              onClose={() => this.setState({ showSupport: false })}
              errorDetails={this.state.errorReport}
            />
          )}
        </div>
      );
    }

    return this.props.children;
  }
}


