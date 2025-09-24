import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Format currency with proper localization
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'SAR', 
  locale: string = 'ar-SA'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date with proper localization
 */
export function formatDate(
  date: Date | string, 
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Generate random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract skills from text using basic keyword matching
 */
export function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'express',
    'python', 'django', 'flask', 'java', 'spring', 'c#', 'asp.net', 'php',
    'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust', 'kotlin', 'swift',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'mysql', 'postgresql',
    'mongodb', 'redis', 'elasticsearch', 'docker', 'kubernetes', 'aws', 'azure',
    'gcp', 'git', 'jenkins', 'ci/cd', 'agile', 'scrum', 'project management',
    'leadership', 'communication', 'problem solving', 'analytical thinking'
  ];

  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => 
    lowerText.includes(skill.toLowerCase())
  );
}

/**
 * Calculate years of experience from text
 */
export function calculateExperienceFromText(text: string): number {
  const lowerText = text.toLowerCase();
  
  // Look for patterns like "5 years", "3+ years", "2-4 years"
  const yearPatterns = [
    /(\d+)\+?\s*years?/g,
    /(\d+)-\d+\s*years?/g,
    /over\s*(\d+)\s*years?/g,
    /more than\s*(\d+)\s*years?/g
  ];

  let maxYears = 0;
  
  for (const pattern of yearPatterns) {
    const matches = [...lowerText.matchAll(pattern)];
    for (const match of matches) {
      const years = parseInt(match[1]);
      if (years > maxYears) {
        maxYears = years;
      }
    }
  }

  return maxYears;
}

/**
 * Sanitize filename for file upload
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}