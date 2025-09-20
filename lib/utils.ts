// Simple className utility without external dependencies
export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Format number with animation-friendly increments
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

// Generate random delay for staggered animations
export function getStaggerDelay(index: number, base: number = 100): number {
  return index * base;
}

// Debounce utility for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Theme-aware color utilities
export function getThemeColor(color: string, opacity?: number): string {
  const opacityValue = opacity ? `/${Math.round(opacity * 100)}` : '';
  return `${color}${opacityValue}`;
}

// RTL-aware positioning
export function getRTLPosition(position: 'left' | 'right', isRTL: boolean): 'left' | 'right' {
  if (!isRTL) return position;
  return position === 'left' ? 'right' : 'left';
}

// Format currency for Saudi Arabia (ar-SA locale)
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

// Fix percentage formatting - show 42% not 0.42%
export function formatPercentage(fraction: number): string {
  return `${Number.isFinite(fraction) ? (fraction * 100).toFixed(1) : '0.0'}%`;
}

// Format date with proper Saudi Arabia locale
export function formatDate(date: Date | string, locale: string = 'ar-SA'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}