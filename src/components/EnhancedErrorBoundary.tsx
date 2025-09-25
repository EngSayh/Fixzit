'use client';
import React from 'react';
import { ErrorContext, useError } from '@/src/contexts/ErrorContext';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class EnhancedErrorBoundary extends React.Component<Props, State> {
  static contextType = ErrorContext;
  declare context: React.ContextType<typeof ErrorContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Enhanced Error Boundary Caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Report error using the new context
    if (this.context) {
      this.context.reportError('SYS-UI-RENDER-001', error.message, {
        stack: error.stack,
        category: 'UI',
        severity: 'ERROR',
        module: 'System',
        autoTicket: true
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We've detected an error and our team has been notified. You can continue using the app.
            </p>
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005299] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  const { reportError } = useError();

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError('SYS-UI-RENDER-001', event.message, {
        stack: event.error?.stack,
        category: 'UI',
        severity: 'ERROR',
        module: 'System',
        autoTicket: true
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError('SYS-UI-RENDER-001', String(event.reason), {
        category: 'UI',
        severity: 'ERROR',
        module: 'System',
        autoTicket: true
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reportError]);

  return <>{children}</>;
}
