/**
 * Safe navigation utilities for iframe environments
 * Prevents SecurityError from cross-frame navigation
 */

interface NavigateOptions {
  replace?: boolean;
}

/**
 * Safely navigate within the current frame (no cross-frame navigation)
 * Use instead of window.top.location or window.parent.location
 */
export function safeNavigate(url: string, options: NavigateOptions = {}): void {
  try {
    if (options.replace) {
      window.location.replace(url);
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    // Fallback for any security restrictions
    console.warn('safeNavigate fallback:', error);
    window.location.href = url;
  }
}

/**
 * Check if we're running in an iframe (like Replit preview)
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // SecurityError means we're definitely in an iframe
    return true;
  }
}

/**
 * Safe reload that works in iframe environments
 */
export function safeReload(): void {
  try {
    window.location.reload();
  } catch (error) {
    console.warn('safeReload fallback:', error);
    window.location.href = window.location.href;
  }
}