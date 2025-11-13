/**
 * Production-safe logging utility
 * Replaces console.* calls with proper logging that:
 * - Respects environment (dev vs production)
 * - Sends errors to monitoring service
 * - Provides structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Log informational message (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment && !this.isTest) {
      console.info('[INFO]', message, context || '');
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment || !this.isTest) {
      console.warn('[WARN]', message, context || '');
    }
    // In production, send to monitoring service
    if (!this.isDevelopment && !this.isTest) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log error message and send to monitoring
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { error };

    if (this.isDevelopment && !this.isTest) {
      console.error('[ERROR]', message, errorInfo, context || '');
    }

    // Always send errors to monitoring (except in tests)
    if (!this.isTest) {
      this.sendToMonitoring('error', message, { ...context, ...errorInfo });
    }
  }

  /**
   * Debug logging (development only)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment && !this.isTest) {
      console.debug('[DEBUG]', message, data || '');
    }
  }

  /**
   * Send log to monitoring service
   * TODO: Integrate with actual monitoring service (Sentry, DataDog, etc.)
   */
  private async sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): Promise<void> {
    try {
      // TODO: Replace with actual monitoring service integration
      // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify({ level, message, context }) });
      
      // For now, store in session for debugging
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
        logs.push({
          level,
          message,
          context,
          timestamp: new Date().toISOString()
        });
        // Keep only last 100 logs
        if (logs.length > 100) logs.shift();
        sessionStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (err) {
      // Silently fail - don't break app if logging fails
      if (this.isDevelopment) {
        console.error('Failed to send log to monitoring:', err);
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);
