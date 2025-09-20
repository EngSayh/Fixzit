// Custom i18n system for FIXZIT SOUQ
import { translations } from './translations';

export type Locale = 'en' | 'ar';
export type TranslationKey = keyof typeof translations.en;

export interface I18nContextType {
  locale: Locale;
  translations: Record<string, any>;
  t: (key: string, params?: Record<string, string | number>) => string;
  switchLanguage: (locale: Locale) => void;
  isRTL: boolean;
}

class I18n {
  private locale: Locale = 'en';
  private translations = translations;

  setLocale(locale: Locale) {
    this.locale = locale;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixzit-locale', locale);
      // Update HTML dir attribute
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }

  getLocale(): Locale {
    return this.locale;
  }

  isRTL(): boolean {
    return this.locale === 'ar';
  }

  // Get translation with support for nested keys and parameters
  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = this.translations[this.locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to English if Arabic translation not found
        value = this.getFallbackTranslation(key);
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{{${paramKey}}}`, String(paramValue));
      });
    }

    return value;
  }

  private getFallbackTranslation(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations.en;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  // Initialize locale from localStorage or browser preference
  init() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fixzit-locale') as Locale;
      const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
      const defaultLocale = stored || browserLang;
      this.setLocale(defaultLocale);
    }
  }

  // Format numbers according to locale
  formatNumber(num: number): string {
    if (this.locale === 'ar') {
      return new Intl.NumberFormat('ar-SA').format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
  }

  // Format currency according to locale
  formatCurrency(amount: number, currency = 'SAR'): string {
    if (this.locale === 'ar') {
      return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency', 
      currency: currency,
    }).format(amount);
  }

  // Format dates according to locale
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    if (this.locale === 'ar') {
      return new Intl.DateTimeFormat('ar-SA', { ...defaultOptions, ...options }).format(d);
    }
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(d);
  }

  // Get direction for CSS
  getDirection(): 'ltr' | 'rtl' {
    return this.locale === 'ar' ? 'rtl' : 'ltr';
  }

  // Get text alignment
  getTextAlign(): 'left' | 'right' {
    return this.locale === 'ar' ? 'right' : 'left';
  }

  // Get opposite text alignment
  getOppositeTextAlign(): 'left' | 'right' {
    return this.locale === 'ar' ? 'left' : 'right';
  }
}

export const i18n = new I18n();
export default i18n;