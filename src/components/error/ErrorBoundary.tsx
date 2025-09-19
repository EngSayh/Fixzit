"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { GlassCard, GlassButton } from '../theme';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      errorId: this.state.errorId,
      level: this.props.level,
      timestamp: new Date().toISOString()
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Report to error monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: this.props.level === 'critical',
        custom_map: {
          error_id: this.state.errorId,
          error_level: this.props.level,
          component_stack: errorInfo.componentStack
        }
      });
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
`);
    
    window.open(`mailto:support@fixzit.com?subject=${subject}&body=${body}`, '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      // Different error displays based on level
      if (this.props.level === 'critical') {
        return <CriticalErrorDisplay 
          error={this.state.error!}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onReportBug={this.handleReportBug}
        />;
      }

      if (this.props.level === 'page') {
        return <PageErrorDisplay 
          error={this.state.error!}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />;
      }

      // Component level error
      return <ComponentErrorDisplay 
        error={this.state.error!}
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

// Critical Error Display (Full Screen)
const CriticalErrorDisplay: React.FC<{
  error: Error;
  errorId: string;
  onRetry: () => void;
  onGoHome: () => void;
  onReportBug: () => void;
}> = ({ error, errorId, onRetry, onGoHome, onReportBug }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-800 flex items-center justify-center p-4">
    <GlassCard className="w-full max-w-2xl p-8 text-center" variant="strong">
      <div className="mb-6">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Critical System Error</h1>
        <p className="text-white/80 text-lg">Something went seriously wrong</p>
      </div>
      
      <div className="bg-black/20 rounded-lg p-4 mb-6 text-left">
        <p className="text-white/60 text-sm mb-2">Error ID: {errorId}</p>
        <p className="text-white font-mono text-sm break-all">{error.message}</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <GlassButton onClick={onRetry} variant="primary" icon={<RefreshCw size={16} />}>
          Try Again
        </GlassButton>
        <GlassButton onClick={onGoHome} variant="secondary" icon={<Home size={16} />}>
          Go Home
        </GlassButton>
        <GlassButton onClick={onReportBug} variant="ghost" icon={<Bug size={16} />}>
          Report Bug
        </GlassButton>
      </div>
    </GlassCard>
  </div>
);

// Page Error Display
const PageErrorDisplay: React.FC<{
  error: Error;
  errorId: string;
  onRetry: () => void;
  onGoHome: () => void;
}> = ({ error, errorId, onRetry, onGoHome }) => (
  <div className="min-h-96 flex items-center justify-center p-4">
    <GlassCard className="w-full max-w-lg p-6 text-center">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Page Error</h2>
      <p className="text-white/60 text-sm mb-4">Error ID: {errorId}</p>
      <p className="text-white/80 mb-6">{error.message}</p>
      
      <div className="flex gap-3 justify-center">
        <GlassButton onClick={onRetry} variant="primary" size="sm" icon={<RefreshCw size={14} />}>
          Retry
        </GlassButton>
        <GlassButton onClick={onGoHome} variant="ghost" size="sm" icon={<Home size={14} />}>
          Go Home
        </GlassButton>
      </div>
    </GlassCard>
  </div>
);

// Component Error Display
const ComponentErrorDisplay: React.FC<{
  error: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <GlassCard className="p-4 border-red-200 bg-red-50/10">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Component Error</p>
        <p className="text-xs text-white/60 mt-1">{error.message}</p>
        <GlassButton 
          onClick={onRetry} 
          variant="ghost" 
          size="sm" 
          className="mt-2 text-xs"
          icon={<RefreshCw size={12} />}
        >
          Retry
        </GlassButton>
      </div>
    </div>
  </GlassCard>
);

export default ErrorBoundary;