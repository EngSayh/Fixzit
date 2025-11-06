/**
 * Production-safe logging utility
 * Category 5 FIX: Centralized logging with environment-aware behavior
 * 
 * - Development: Logs to console for debugging
 * - Production: Can integrate with monitoring services
 * - Test: Suppresses logs to reduce noise
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

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment && !this.isTest) {
      console.info('[INFO]', message, context || '');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment && !this.isTest) {
      console.warn('[WARN]', message, context || '');
    }
    if (!this.isDevelopment && !this.isTest) {
      this.persistLogToSessionStorage('warn', message, context);
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), originalError: error };

    if (this.isDevelopment && !this.isTest) {
      console.error('[ERROR]', message, errorDetails, context || '');
    }

    if (!this.isTest) {
      this.persistLogToSessionStorage('error', message, { ...context, ...errorDetails });
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment && !this.isTest) {
      console.debug('[DEBUG]', message, data || '');
    }
  }

  /**
   * Persist logs to session storage for later retrieval
   * Note: This is NOT external monitoring - logs are stored locally in browser
   * For production monitoring, integrate with Sentry/DataDog/etc in this method
   */
  private persistLogToSessionStorage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
        logs.push({ level, message, context, timestamp: new Date().toISOString() });
        if (logs.length > 100) logs.shift();
        sessionStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (err) {
      if (this.isDevelopment) {
        console.error('Failed to persist log to session storage:', err);
      }
      // In production, this failure should be handled silently
      // or sent to a fallback monitoring system to prevent log loss
    }
  }
}

export const logger = new Logger();
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);

export default {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
