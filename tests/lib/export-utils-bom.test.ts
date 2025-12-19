/**
 * @fileoverview Test BUG-002 fix - CSV export with UTF-8 BOM for Arabic encoding
 * @description Verifies that CSV exports include BOM for proper Excel UTF-8 detection
 * @module tests/lib/export-utils-bom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { downloadCSV, arrayToCSV, exportToCSV } from '@/lib/export-utils';

describe('[BUG-002] CSV Export Arabic Encoding Fix', () => {
  // Mock document.createElement for download tests
  let mockLink: {
    setAttribute: ReturnType<typeof vi.fn>;
    click: ReturnType<typeof vi.fn>;
    style: Record<string, string>;
  };

  let mockUrl: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockUrl = 'blob:mock-url';
    global.URL.createObjectURL = vi.fn(() => mockUrl);
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };

    global.document.createElement = vi.fn((tag: string) => {
      if (tag === 'a') {
        return mockLink as unknown as HTMLAnchorElement;
      }
      throw new Error(`Unexpected createElement call with tag: ${tag}`);
    });

    // Mock document.body methods
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadCSV function', () => {
    it('should prepend UTF-8 BOM (\\uFEFF) to CSV content', () => {
      const csvContent = 'Name,Description\nProduct,الوصف بالعربية';
      const filename = 'test-export.csv';

      downloadCSV(csvContent, filename);

      // Verify Blob was created with BOM prepended
      expect(global.Blob).toHaveBeenCalledWith(
        ['\uFEFF' + csvContent],
        { type: 'text/csv;charset=utf-8;' }
      );
    });

    it('should create blob with correct MIME type', () => {
      const csvContent = 'Column1,Column2\nValue1,Value2';
      const filename = 'data.csv';

      downloadCSV(csvContent, filename);

      expect(global.Blob).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'text/csv;charset=utf-8;' }
      );
    });

    it('should trigger download with correct filename', () => {
      const csvContent = 'Test,Data';
      const filename = 'export-2024-12-19.csv';

      downloadCSV(csvContent, filename);

      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', mockUrl);
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', filename);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should cleanup DOM and revoke URL after download', () => {
      const csvContent = 'Test';
      const filename = 'test.csv';

      downloadCSV(csvContent, filename);

      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should handle empty CSV content with BOM', () => {
      const csvContent = '';
      const filename = 'empty.csv';

      downloadCSV(csvContent, filename);

      // Even empty content should have BOM
      expect(global.Blob).toHaveBeenCalledWith(
        ['\uFEFF'],
        { type: 'text/csv;charset=utf-8;' }
      );
    });
  });

  describe('Arabic text encoding validation', () => {
    it('should preserve Arabic characters in CSV with BOM', () => {
      const arabicText = 'الوصف بالعربية';
      const csvContent = `Name,Description\nProduct,${arabicText}`;
      const filename = 'arabic-test.csv';

      downloadCSV(csvContent, filename);

      // Extract the blob content from the mock call
      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      // Verify BOM is present
      expect(blobContent).toMatch(/^\uFEFF/);

      // Verify Arabic text is preserved
      expect(blobContent).toContain(arabicText);
    });

    it('should handle mixed English and Arabic content', () => {
      const mixedContent = 'Work Order,أمر العمل\nDescription,الوصف';
      const filename = 'mixed-language.csv';

      downloadCSV(mixedContent, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain('أمر العمل');
      expect(blobContent).toContain('الوصف');
    });

    it('should handle special Arabic characters and diacritics', () => {
      // Test with Arabic text containing diacritics and special chars
      const arabicWithDiacritics = 'الْعَرَبِيَّة (مَعَ التَّشْكِيل)';
      const csvContent = `Text,${arabicWithDiacritics}`;
      const filename = 'diacritics.csv';

      downloadCSV(csvContent, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain(arabicWithDiacritics);
    });
  });

  describe('Integration with arrayToCSV', () => {
    it('should work with arrayToCSV output containing Arabic', () => {
      const data = [
        { id: 1, name: 'منتج 1', description: 'وصف المنتج' },
        { id: 2, name: 'منتج 2', description: 'وصف آخر' },
      ];

      const csvContent = arrayToCSV(data, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'الاسم' },
        { key: 'description', label: 'الوصف' },
      ]);

      downloadCSV(csvContent, 'products.csv');

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      // Verify BOM + CSV structure
      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain('الاسم');
      expect(blobContent).toContain('منتج 1');
      expect(blobContent).toContain('وصف المنتج');
    });
  });

  describe('exportToCSV wrapper function', () => {
    it('should export with BOM when using convenience wrapper', () => {
      const data = [
        { workOrder: 'WO-001', status: 'مفتوح', priority: 'عالي' },
        { workOrder: 'WO-002', status: 'مغلق', priority: 'منخفض' },
      ];

      exportToCSV(data, 'work-orders.csv');

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain('مفتوح');
      expect(blobContent).toContain('عالي');
    });
  });

  describe('BOM character validation', () => {
    it('should use exactly \\uFEFF as BOM (Unicode: U+FEFF)', () => {
      const csvContent = 'Test';
      const filename = 'test.csv';

      downloadCSV(csvContent, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      // Verify exact BOM character (U+FEFF)
      expect(blobContent.charCodeAt(0)).toBe(0xfeff);
    });

    it('should only prepend BOM once (no duplication)', () => {
      const csvContent = 'Data';
      const filename = 'test.csv';

      downloadCSV(csvContent, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      // Count BOM occurrences (should be exactly 1 at start)
      const bomCount = (blobContent.match(/\uFEFF/g) || []).length;
      expect(bomCount).toBe(1);
      expect(blobContent.indexOf('\uFEFF')).toBe(0);
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing CSV exports without Arabic', () => {
      const englishData = 'Name,Email\nJohn Doe,john@example.com';
      const filename = 'users.csv';

      downloadCSV(englishData, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      // BOM should not interfere with English text
      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain('John Doe');
      expect(blobContent).toContain('john@example.com');
    });

    it('should handle numeric and special characters correctly', () => {
      const csvContent = 'ID,Price,Symbol\n123,99.99,€';
      const filename = 'prices.csv';

      downloadCSV(csvContent, filename);

      const blobArgs = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const blobContent = blobArgs[0][0];

      expect(blobContent).toMatch(/^\uFEFF/);
      expect(blobContent).toContain('99.99');
      expect(blobContent).toContain('€');
    });
  });
});
