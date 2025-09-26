'use client&apos;;
import React from &apos;react&apos;;
import dynamic from &apos;next/dynamic&apos;;

const SupportPopup = dynamic(() => import(&apos;@/src/components/SupportPopup&apos;), { ssr: false });

type ErrorState = {
  hasError: boolean;
  msg?: string;
  errorType?: string;
  fixAttempted?: boolean;
  fixSuccessful?: boolean;
  retryCount?: number;
  errorReport?: any;
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
      pattern: /Failed to execute &apos;json&apos; on &apos;Response&apos;/,
      type: &apos;JSON_PARSE_ERROR&apos;,
      autoFix: async (error: Error) => {
        console.log(&apos;🔧 Auto-fixing JSON parsing error...&apos;);

        // Clear localStorage cache that might be corrupted
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
        console.log(&apos;⚠️ JSON fix fallback triggered&apos;);
        this.forceRefresh();
      }
    },

    // Module not found errors
    {
      pattern: /Module not found|Can&apos;t resolve/,
      type: &apos;MODULE_NOT_FOUND&apos;,
      autoFix: async (error: Error) => {
        console.log(&apos;🔧 Auto-fixing module resolution...&apos;);

        // Try to clear module cache
        try {
          if (typeof window !== &apos;undefined&apos;) {
            // Clear any cached imports
            Object.keys(window).forEach(key => {
              if (key.startsWith(&apos;__webpack&apos;) || key.startsWith(&apos;__next&apos;)) {
                delete (window as any)[key];
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
        console.log(&apos;⚠️ Module fix fallback triggered&apos;);
        this.showErrorMessage(&apos;Module loading failed. Please refresh the page.&apos;);
      }
    },

    // Network errors
    {
      pattern: /fetch.*failed|Network request failed/,
      type: &apos;NETWORK_ERROR&apos;,
      autoFix: async (error: Error) => {
        console.log(&apos;🔧 Auto-fixing network error...&apos;);

        try {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check if online
          if (!navigator.onLine) {
            this.showErrorMessage(&apos;Please check your internet connection.&apos;);
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        console.log(&apos;⚠️ Network fix fallback triggered&apos;);
        this.showErrorMessage(&apos;Network error. Please check your connection and try again.&apos;);
      }
    },

    // Hydration errors
    {
      pattern: /hydration|Hydration failed/,
      type: &apos;HYDRATION_ERROR&apos;,
      autoFix: async (error: Error) => {
        console.log(&apos;🔧 Auto-fixing hydration error...&apos;);

        try {
          // Force client-side rendering mode
          localStorage.setItem(&apos;fxz.render&apos;, &apos;client&apos;);
          window.location.reload();
          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        console.log(&apos;⚠️ Hydration fix fallback triggered&apos;);
        this.showErrorMessage(&apos;Rendering error. Please refresh the page.&apos;);
      }
    },

    // Generic runtime errors
    {
      pattern: /TypeError|ReferenceError/,
      type: &apos;RUNTIME_ERROR&apos;,
      autoFix: async (error: Error) => {
        console.log(&apos;🔧 Auto-fixing runtime error...&apos;);

        try {
          // Clear application state
          localStorage.removeItem(&apos;fxz.auth&apos;);
          localStorage.removeItem(&apos;fxz.user&apos;);
          localStorage.removeItem(&apos;fxz.state&apos;);

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
        console.log(&apos;⚠️ Runtime fix fallback triggered&apos;);
        this.showErrorMessage(&apos;Application error. Please refresh and try again.&apos;);
      }
    }
  ];

  static getDerivedStateFromError(error: unknown): Partial<ErrorState> {
    const err = error as Error;
    return {
      hasError: true,
      msg: err?.message,
      errorType: err?.name || &apos;Unknown&apos;
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const err = error as Error;
    console.error(&apos;🚨 UI Error Caught:&apos;, {
      error: err,
      message: err?.message,
      stack: err?.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

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
      const userStr = typeof localStorage !== &apos;undefined&apos; ? localStorage.getItem(&apos;x-user&apos;) : null;
      const user = userStr ? JSON.parse(userStr) : null;
      const truncate = (s?: string, n = 4000) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
      const safeUser = user ? { userId: user.id, tenant: user.tenantId } : undefined;
      const payload = {
        code: &apos;UI-UI-RENDER-001&apos;,
        incidentKey: errorReport.errorId,
        message: truncate(errorReport.error.message, 500),
        details: truncate(errorReport.error.stack, 4000),
        userContext: safeUser,
        clientContext: {
          url: errorReport.url,
          userAgent: errorReport.userAgent,
          locale: errorReport.system.language,
          rtl: typeof document !== &apos;undefined&apos; ? (document.dir === &apos;rtl&apos;) : false,
          time: errorReport.timestamp
        }
      };
      // Prevent duplicate submission if AutoIncidentReporter already sent for this errorId
      if (typeof sessionStorage !== &apos;undefined&apos;) {
        const last = sessionStorage.getItem(&apos;fxz_last_incident&apos;);
        if (last === errorReport.errorId) return;
        sessionStorage.setItem(&apos;fxz_last_incident&apos;, errorReport.errorId);
      }
      const blob = new Blob([JSON.stringify(payload)], { type: &apos;application/json&apos; });
      if (!('sendBeacon&apos; in navigator) || !(navigator as any).sendBeacon(&apos;/api/support/incidents&apos;, blob)) {
        fetch(&apos;/api/support/incidents&apos;, { method: &apos;POST&apos;, headers: { &apos;content-type&apos;: &apos;application/json&apos; }, body: JSON.stringify(payload), keepalive: true });
      }
    } catch {}
  }

  private logErrorToQA = (errorReport: any) => {
    fetch(&apos;/api/qa/log&apos;, {
      method: &apos;POST&apos;,
      headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
      body: JSON.stringify({
        event: &apos;ERROR_BOUNDARY_CAUGHT&apos;,
        data: errorReport,
        level: &apos;ERROR&apos;,
        source: &apos;ErrorBoundary&apos;,
        category: &apos;UI_ERROR&apos;
      })
    }).catch(() => {}); // Fire and forget
  };

  private attemptAutoFix = async (error: Error) => {
    console.log(&apos;🤖 Attempting auto-fix for:&apos;, error.message);

    for (const fix of this.errorFixes) {
      if (fix.pattern.test(error.message)) {
        console.log(`🔧 Applying ${fix.type} fix...`);

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
          console.error(&apos;❌ Auto-fix failed:&apos;, fixError);
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
    fetch(&apos;/api/qa/log&apos;, {
      method: &apos;POST&apos;,
      headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
      body: JSON.stringify({
        event: &apos;AUTO_FIX_ATTEMPT&apos;,
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
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userId: localStorage.getItem(&apos;x-user&apos;) ? &apos;Authenticated User&apos; : &apos;Guest User&apos;,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      system: {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      },
      localStorage: {
        hasAuth: !!localStorage.getItem(&apos;x-user&apos;),
        hasUser: !!localStorage.getItem(&apos;fxz.user&apos;),
        hasLang: !!localStorage.getItem(&apos;fxz.lang&apos;),
        hasTheme: !!localStorage.getItem(&apos;fxz.theme&apos;)
      }
    };

    return errorReport;
  };

  // Copy error details to clipboard
  private copyErrorDetails = (errorReport: any) => {
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
  ${errorReport.system.memory ? `Memory: ${Math.round(errorReport.system.memory.used / 1024 / 1024)}MB / ${Math.round(errorReport.system.memory.total / 1024 / 1024)}MB` : &apos;'}

🔧 Application State:
  Authenticated: ${errorReport.localStorage.hasAuth}
  User Data: ${errorReport.localStorage.hasUser}
  Language Set: ${errorReport.localStorage.hasLang}
  Theme Set: ${errorReport.localStorage.hasTheme}

📋 Stack Trace:
${errorReport.error.stack || &apos;No stack trace available&apos;}

📄 Component Stack:
${errorReport.error.componentStack || &apos;No component stack available&apos;}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      this.showErrorMessage(&apos;Error details copied to clipboard!&apos;);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement(&apos;textarea&apos;);
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand(&apos;copy&apos;);
      document.body.removeChild(textArea);
      this.showErrorMessage(&apos;Error details copied to clipboard!&apos;);
    });
  };

  // Open Support popup for detailed submission (guests provide info; users use session)
  private openSupport = () => {
    this.setState({ showSupport: true });
  };

  // Send welcome email to new users who encountered errors
  private sendWelcomeEmail = async (email: string, errorId: string) => {
    try {
      await fetch(&apos;/api/support/welcome-email&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({
          email,
          errorId,
          subject: &apos;Welcome to Fixzit Enterprise - Error Resolution Steps&apos;,
          registrationLink: `${window.location.origin}/login?welcome=true`
        })
      });
    } catch (error) {
      console.error(&apos;Failed to send welcome email:&apos;, error);
    }
  };

  private handleRetry = () => {
    const newRetryCount = (this.state.retryCount || 0) + 1;

    if (newRetryCount >= 3) {
      this.showErrorMessage(&apos;Maximum retry attempts reached. Please refresh the page manually.&apos;);
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
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {this.state.fixSuccessful ? &apos;Auto-Fix Applied&apos; : &apos;System Error Detected&apos;}
            </h2>

            <p className="text-gray-600 mb-4">
              {this.state.fixSuccessful
                ? &apos;The system has automatically fixed the issue and is reloading...&apos;
                : this.state.fixAttempted
                  ? &apos;Auto-fix attempted but failed. Manual intervention required.&apos;
                  : this.state.msg || &apos;An unexpected error occurred.&apos;
              }
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Error ID:</strong> <code className="bg-blue-100 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Please include this ID when reporting the issue
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {this.state.fixAttempted && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  this.state.fixSuccessful
                    ? &apos;bg-green-100 text-green-800&apos;
                    : &apos;bg-red-100 text-red-800&apos;
                }`}>
                  {this.state.fixSuccessful ? &apos;✅ Fixed&apos; : &apos;❌ Fix Failed&apos;}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Retry: {this.state.retryCount || 0}/3
              </span>
              {this.state.ticketCreated && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  📝 Support Ticket: {this.state.ticketId}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {this.state.fixSuccessful ? (
                <div className="text-sm text-gray-500">
                  🔄 Reloading automatically...
                </div>
              ) : (
                <>
                  <button
                    onClick={this.handleRetry}
                    disabled={(this.state.retryCount || 0) >= 3}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Retry ({3 - (this.state.retryCount || 0)} attempts left)
                  </button>

                  <button
                    onClick={this.handleManualRefresh}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    🔄 Force Refresh
                  </button>

                  {/* Copy Error Details */}
                  {this.state.errorReport && (
                    <button
                      onClick={() => this.copyErrorDetails(this.state.errorReport)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      📋 Copy Error Details
                    </button>
                  )}

                  {/* Open Support Ticket Dialog */}
                  {this.state.errorReport && !this.state.ticketCreated && (
                    <button
                      onClick={this.openSupport}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      📝 Report to Support
                    </button>
                  )}

                  <a
                    href="/help"
                    className="inline-block w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-center"
                  >
                    📚 Get Help
                  </a>
                </>
              )}
            </div>

            {/* Technical Details */}
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                🔍 Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-auto">
                <div><strong>Error:</strong> {this.state.msg}</div>
                <div><strong>Type:</strong> {this.state.errorType}</div>
                <div><strong>Time:</strong> {new Date().toISOString()}</div>
                <div><strong>URL:</strong> {typeof window !== &apos;undefined&apos; ? window.location.href : &apos;SSR&apos;}</div>
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
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  📋 Stack Trace
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-auto max-h-40">
                  {this.state.errorReport.error.stack || &apos;No stack trace available&apos;}
                </div>
              </details>
            )}

            {/* Component Stack */}
            {this.state.errorReport && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  📄 Component Stack
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-auto max-h-40">
                  {this.state.errorReport.error.componentStack || &apos;No component stack available&apos;}
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

