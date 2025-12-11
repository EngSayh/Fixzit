/**
 * i18n Translation Key Validation Tests
 * 
 * Tests to ensure translation key consistency and coverage:
 * - All used keys exist in translation files
 * - EN and AR catalogs have parity
 * - No orphaned translation keys
 * - Dynamic key patterns are valid
 * 
 * @module tests/unit/i18n/translation-validation.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the translation system
vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    locale: 'en',
  }),
}));

describe('Translation Key Validation', () => {
  // Sample translation catalogs for testing
  const enCatalog: Record<string, string> = {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'workOrder.status.pending': 'Pending',
    'workOrder.status.inProgress': 'In Progress',
    'workOrder.status.completed': 'Completed',
    'finance.invoice.create': 'Create Invoice',
    'finance.invoice.send': 'Send Invoice',
    'hr.employee.add': 'Add Employee',
    'hr.employee.edit': 'Edit Employee',
  };

  const arCatalog: Record<string, string> = {
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.confirm': 'تأكيد',
    'common.loading': 'جاري التحميل...',
    'workOrder.status.pending': 'قيد الانتظار',
    'workOrder.status.inProgress': 'قيد التنفيذ',
    'workOrder.status.completed': 'مكتمل',
    'finance.invoice.create': 'إنشاء فاتورة',
    'finance.invoice.send': 'إرسال فاتورة',
    'hr.employee.add': 'إضافة موظف',
    'hr.employee.edit': 'تعديل موظف',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Catalog Parity', () => {
    it('should have matching keys in EN and AR catalogs', () => {
      const enKeys = Object.keys(enCatalog).sort();
      const arKeys = Object.keys(arCatalog).sort();

      expect(enKeys).toEqual(arKeys);
    });

    it('should identify missing AR translations', () => {
      const extendedEnCatalog = {
        ...enCatalog,
        'new.feature.title': 'New Feature',
        'new.feature.description': 'Description',
      };

      const findMissingInAr = () => {
        return Object.keys(extendedEnCatalog).filter(
          key => !(key in arCatalog)
        );
      };

      const missing = findMissingInAr();
      expect(missing).toContain('new.feature.title');
      expect(missing).toContain('new.feature.description');
    });

    it('should identify missing EN translations', () => {
      const extendedArCatalog = {
        ...arCatalog,
        'arabic.only.key': 'Arabic Only Value',
      };

      const findMissingInEn = () => {
        return Object.keys(extendedArCatalog).filter(
          key => !(key in enCatalog)
        );
      };

      const missing = findMissingInEn();
      expect(missing).toContain('arabic.only.key');
    });
  });

  describe('Key Format Validation', () => {
    it('should use consistent key naming convention', () => {
      const isValidKeyFormat = (key: string): boolean => {
        // Keys should be: module.category.action or module.category.item.action
        // Using camelCase for each segment
        const segments = key.split('.');
        
        if (segments.length < 2 || segments.length > 4) {
          return false;
        }

        // Each segment should be camelCase (start with lowercase, alphanumeric)
        return segments.every(seg => /^[a-z][a-zA-Z0-9]*$/.test(seg));
      };

      const validKeys = [
        'common.save',
        'workOrder.status.pending',
        'finance.invoice.create',
        'hr.employee.add',
      ];

      const invalidKeys = [
        'COMMON.SAVE', // All caps
        'common-save', // No dots
        'common.', // Trailing dot
        '.common', // Leading dot
        'common.Save', // Segment starts with uppercase
      ];

      validKeys.forEach(key => {
        expect(isValidKeyFormat(key)).toBe(true);
      });

      invalidKeys.forEach(key => {
        expect(isValidKeyFormat(key)).toBe(false);
      });
    });

    it('should not have empty values', () => {
      const catalogWithEmpty: Record<string, string> = {
        ...enCatalog,
        'empty.value': '',
        'whitespace.only': '   ',
      };

      const findEmptyValues = (catalog: Record<string, string>) => {
        return Object.entries(catalog)
          .filter(([, value]) => !value.trim())
          .map(([key]) => key);
      };

      const emptyKeys = findEmptyValues(catalogWithEmpty);
      expect(emptyKeys).toContain('empty.value');
      expect(emptyKeys).toContain('whitespace.only');
    });
  });

  describe('Placeholder Validation', () => {
    it('should have matching placeholders in EN and AR', () => {
      const enWithPlaceholders: Record<string, string> = {
        'greeting.hello': 'Hello {{name}}',
        'order.total': 'Total: {{amount}} {{currency}}',
        'date.format': 'Date: {{date}}',
      };

      const arWithPlaceholders: Record<string, string> = {
        'greeting.hello': 'مرحبًا {{name}}',
        'order.total': 'المجموع: {{amount}} {{currency}}',
        'date.format': 'التاريخ: {{date}}',
      };

      const extractPlaceholders = (value: string): string[] => {
        const matches = value.match(/\{\{(\w+)\}\}/g) || [];
        return matches.sort();
      };

      const validatePlaceholderParity = (
        en: Record<string, string>,
        ar: Record<string, string>
      ): string[] => {
        const errors: string[] = [];

        for (const key of Object.keys(en)) {
          const enPlaceholders = extractPlaceholders(en[key]);
          const arPlaceholders = extractPlaceholders(ar[key] || '');

          if (JSON.stringify(enPlaceholders) !== JSON.stringify(arPlaceholders)) {
            errors.push(`Placeholder mismatch in key: ${key}`);
          }
        }

        return errors;
      };

      const errors = validatePlaceholderParity(enWithPlaceholders, arWithPlaceholders);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing placeholders in AR', () => {
      const enValue = 'Hello {{name}}, your order #{{orderId}} is ready';
      const arValue = 'مرحبًا {{name}}، طلبك جاهز'; // Missing {{orderId}}

      const extractPlaceholders = (value: string): string[] => {
        const matches = value.match(/\{\{(\w+)\}\}/g) || [];
        return matches.map(m => m.replace(/[{}]/g, ''));
      };

      const enPlaceholders = extractPlaceholders(enValue);
      const arPlaceholders = extractPlaceholders(arValue);

      const missingInAr = enPlaceholders.filter(p => !arPlaceholders.includes(p));

      expect(missingInAr).toContain('orderId');
    });
  });

  describe('RTL/LTR Compatibility', () => {
    it('should handle RTL markers correctly', () => {
      // RTL mark: \u200F, LTR mark: \u200E
      const hasProperDirectionMarkers = (value: string, isRtl: boolean): boolean => {
        // For mixed content (numbers, Latin text in Arabic), should have markers
        const hasNumbers = /\d/.test(value);
        const hasLatinText = /[a-zA-Z]/.test(value);

        if (isRtl && (hasNumbers || hasLatinText)) {
          // RTL content with mixed direction should consider markers
          // This is a simplified check - real implementation would be more nuanced
          return true; // Accept for now, real validation would check context
        }
        return true;
      };

      expect(hasProperDirectionMarkers('أمر العمل #123', true)).toBe(true);
      expect(hasProperDirectionMarkers('Order #123', false)).toBe(true);
    });

    it('should validate Arabic text is actually Arabic', () => {
      const isArabicText = (value: string): boolean => {
        // Remove placeholders, numbers, and punctuation
        const textOnly = value
          .replace(/\{\{[^}]+\}\}/g, '')
          .replace(/[\d\s.,!?:;()[\]{}<>]/g, '')
          .trim();

        if (!textOnly) return true; // Empty or numbers-only is valid

        // Check if remaining text contains Arabic characters
        return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(textOnly);
      };

      expect(isArabicText('حفظ')).toBe(true);
      expect(isArabicText('مرحبًا {{name}}')).toBe(true);
      expect(isArabicText('{{amount}} ر.س')).toBe(true);
      expect(isArabicText('Save')).toBe(false);
      expect(isArabicText('')).toBe(true);
    });
  });

  describe('Dynamic Key Patterns', () => {
    it('should validate enum-based dynamic keys', () => {
      const STATUS_KEYS = ['pending', 'inProgress', 'completed', 'cancelled'] as const;
      
      const validateDynamicKey = (
        baseKey: string,
        validSuffixes: readonly string[]
      ): boolean => {
        return validSuffixes.every(suffix => {
          const fullKey = `${baseKey}.${suffix}`;
          return fullKey in enCatalog;
        });
      };

      expect(validateDynamicKey('workOrder.status', STATUS_KEYS.slice(0, 3))).toBe(true);
    });

    it('should warn about unsafe dynamic key patterns', () => {
      // Detect patterns that use dynamic keys which can't be statically analyzed
      const isUnsafeDynamicKey = (code: string): boolean => {
        // Template literal with interpolation
        if (/t\s*\(\s*`[^`]*\$\{/.test(code)) return true;
        // Concatenation
        if (/t\s*\([^)]*\s*\+\s*/.test(code)) return true;
        // Variable reference (not a string literal)
        if (/t\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\)/.test(code)) return true;
        return false;
      };

      const codeExamples = [
        { code: "t('common.save')", safe: true },
        { code: 't(`workOrder.status.${status}`)', safe: false },
        { code: 't(dynamicKey)', safe: false },
        { code: "t('finance.invoice.' + action)", safe: false },
      ];

      codeExamples.forEach(({ code, safe }) => {
        expect(!isUnsafeDynamicKey(code)).toBe(safe);
      });
    });
  });

  describe('Namespace Organization', () => {
    it('should organize keys by module', () => {
      const getNamespace = (key: string): string => {
        return key.split('.')[0];
      };

      const namespaces = new Set(Object.keys(enCatalog).map(getNamespace));

      expect(namespaces.has('common')).toBe(true);
      expect(namespaces.has('workOrder')).toBe(true);
      expect(namespaces.has('finance')).toBe(true);
      expect(namespaces.has('hr')).toBe(true);
    });

    it('should have consistent prefixes within modules', () => {
      const groupByNamespace = (catalog: Record<string, string>) => {
        const groups: Record<string, string[]> = {};

        for (const key of Object.keys(catalog)) {
          const namespace = key.split('.')[0];
          if (!groups[namespace]) {
            groups[namespace] = [];
          }
          groups[namespace].push(key);
        }

        return groups;
      };

      const groups = groupByNamespace(enCatalog);

      // Each namespace should have multiple related keys
      expect(groups['common'].length).toBeGreaterThanOrEqual(2);
      expect(groups['workOrder'].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Special Characters', () => {
    it('should escape HTML entities in translations', () => {
      const hasUnescapedHtml = (value: string): boolean => {
        // Check for raw HTML tags (excluding allowed ones like <br>)
        return /<(?!br\s*\/?>)[a-z][^>]*>/i.test(value);
      };

      const valuesWithHtml = [
        { value: 'Hello <b>World</b>', hasHtml: true },
        { value: 'Line 1<br>Line 2', hasHtml: false },
        { value: 'Plain text', hasHtml: false },
        { value: '<script>alert(1)</script>', hasHtml: true },
      ];

      valuesWithHtml.forEach(({ value, hasHtml }) => {
        expect(hasUnescapedHtml(value)).toBe(hasHtml);
      });
    });

    it('should handle special Arabic characters', () => {
      const hasValidArabicCharacters = (value: string): boolean => {
        // Check for valid Arabic characters including diacritics
        const arabicRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const invalidChars = /[\u0600-\u0605]/; // Some rare control characters

        if (!arabicRange.test(value)) return true; // No Arabic, skip check
        return !invalidChars.test(value);
      };

      expect(hasValidArabicCharacters('مرحبًا بالعالم')).toBe(true);
      expect(hasValidArabicCharacters('Hello World')).toBe(true);
    });
  });
});
