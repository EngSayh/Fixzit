/**/**

 * Production-safe logging utility * Production-safe logging utility

 *  * Replaces console.* calls with proper logging that:

 * ✅ CATEGORY 5 FIX: Centralized logging with environment-aware behavior * - Respects environment (dev vs production)

 *  * - Sends errors to monitoring service

 * - Development: Logs to console for debugging * - Provides structured logging

 * - Production: Can integrate with monitoring services (e.g., Sentry, DataDog) */

 * - Test: Suppresses logs to reduce noise

 */type LogLevel = 'info' | 'warn' | 'error' | 'debug';



type LogLevel = 'info' | 'warn' | 'error' | 'debug';interface LogContext {

  component?: string;

interface LogContext {  action?: string;

  component?: string;  userId?: string;

  userId?: string;  [key: string]: unknown;

  correlationId?: string;}

  [key: string]: unknown;

}class Logger {

  private isDevelopment = process.env.NODE_ENV === 'development';

const isDevelopment = process.env.NODE_ENV === 'development';  private isTest = process.env.NODE_ENV === 'test';

const isTest = process.env.NODE_ENV === 'test';

const isProduction = process.env.NODE_ENV === 'production';  /**

   * Log informational message (development only)

/**   */

 * Structured logging function  info(message: string, context?: LogContext): void {

 * @param level - Log level    if (this.isDevelopment && !this.isTest) {

 * @param message - Log message      console.info('[INFO]', message, context || '');

 * @param error - Optional error object    }

 * @param context - Additional context  }

 */

function log(  /**

  level: LogLevel,   * Log warning message

  message: string,   */

  error?: Error | unknown | null,  warn(message: string, context?: LogContext): void {

  context?: LogContext    if (this.isDevelopment || !this.isTest) {

): void {      console.warn('[WARN]', message, context || '');

  // Suppress logs in test environment unless explicitly enabled    }

  if (isTest && !process.env.ENABLE_TEST_LOGS) {    // In production, send to monitoring service

    return;    if (!this.isDevelopment && !this.isTest) {

  }      this.sendToMonitoring('warn', message, context);

    }

  const timestamp = new Date().toISOString();  }

  const logData = {

    timestamp,  /**

    level,   * Log error message and send to monitoring

    message,   */

    ...(context && { context }),  error(message: string, error?: Error | unknown, context?: LogContext): void {

    ...(error && {    const errorInfo = error instanceof Error ? {

      error: error instanceof Error      message: error.message,

        ? {      stack: error.stack,

            name: error.name,      name: error.name

            message: error.message,    } : { error };

            stack: isDevelopment ? error.stack : undefined,

          }    if (this.isDevelopment && !this.isTest) {

        : String(error),      console.error('[ERROR]', message, errorInfo, context || '');

    }),    }

  };

    // Always send errors to monitoring (except in tests)

  // In development, use console for immediate feedback    if (!this.isTest) {

  if (isDevelopment) {      this.sendToMonitoring('error', message, { ...context, ...errorInfo });

    const consoleMethod = level === 'error' ? console.error : console.log;    }

    consoleMethod(`[${level.toUpperCase()}]`, message, logData);  }

    return;

  }  /**

   * Debug logging (development only)

  // In production, structure logs for external systems   */

  if (isProduction) {  debug(message: string, data?: unknown): void {

    // TODO: Integrate with monitoring service (e.g., Sentry, DataDog, CloudWatch)    if (this.isDevelopment && !this.isTest) {

    // For now, use structured console output that can be parsed by log aggregators      console.debug('[DEBUG]', message, data || '');

    console.log(JSON.stringify(logData));    }

      }

    // Example Sentry integration (commented out):

    // if (level === 'error' && error instanceof Error) {  /**

    //   Sentry.captureException(error, { contexts: { custom: context } });   * Send log to monitoring service

    // }   * TODO: Integrate with actual monitoring service (Sentry, DataDog, etc.)

  }   */

}  private async sendToMonitoring(

    level: LogLevel,

/**    message: string,

 * Log error messages    context?: LogContext

 * @param message - Error message  ): Promise<void> {

 * @param error - Error object or value    try {

 * @param context - Additional context      // TODO: Replace with actual monitoring service integration

 */      // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify({ level, message, context }) });

export function logError(      

  message: string,      // For now, store in session for debugging

  error?: Error | unknown | null,      if (typeof window !== 'undefined' && window.sessionStorage) {

  context?: LogContext        const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');

): void {        logs.push({

  log('error', message, error, context);          level,

}          message,

          context,

/**          timestamp: new Date().toISOString()

 * Log warning messages        });

 * @param message - Warning message        // Keep only last 100 logs

 * @param context - Additional context        if (logs.length > 100) logs.shift();

 */        sessionStorage.setItem('app_logs', JSON.stringify(logs));

export function logWarn(message: string, context?: LogContext): void {      }

  log('warn', message, null, context);    } catch (err) {

}      // Silently fail - don't break app if logging fails

      if (this.isDevelopment) {

/**        console.error('Failed to send log to monitoring:', err);

 * Log info messages      }

 * @param message - Info message    }

 * @param context - Additional context  }

 */}

export function logInfo(message: string, context?: LogContext): void {

  log('info', message, null, context);// Export singleton instance

}export const logger = new Logger();



/**// Convenience exports

 * Log debug messages (only in development)export const logInfo = logger.info.bind(logger);

 * @param message - Debug messageexport const logWarn = logger.warn.bind(logger);

 * @param context - Additional contextexport const logError = logger.error.bind(logger);

 */export const logDebug = logger.debug.bind(logger);

export function logDebug(message: string, context?: LogContext): void {
  if (isDevelopment) {
    log('debug', message, null, context);
  }
}

// Default export for convenience
export default {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
