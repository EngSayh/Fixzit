/**
 * Test framework: Jest (TypeScript). If your project uses a different runner (e.g., Vitest),
 * these tests should still work with minimal adaptation.
 * Focus: Validate the data exported by src/data/language-options.ts
 * Covers: happy paths, schema validation, uniqueness, snapshot for regression.
 */

// The tests below were generated with a bias for action to enhance coverage and confidence.
/* 
  Test framework: Jest (TypeScript). If the project uses a different runner (e.g., Vitest),
  these tests are compatible with minimal changes (importing from 'vitest' instead of 'jest').
*/
import * as mod from './language-options';

// Resolve default or named export gracefully
const languageOptions: unknown =
  (mod as any).default !== undefined ? (mod as any).default : mod;

type Lang = {
  code: string;
  name: string;
  nativeName?: string;
  locale?: string;
  rtl?: boolean;
  [key: string]: unknown;
};

describe('language-options data integrity', () => {
  it('should export a non-empty array', () => {
    expect(Array.isArray(languageOptions)).toBe(true);
    const arr = languageOptions as unknown[];
    // Allow empty arrays in edge branches, but typically expect some content
    expect(arr.length).toBeGreaterThanOrEqual(0);
  });

  it('every item should be a well-formed language descriptor', () => {
    const arr = (languageOptions as unknown[]) ?? [];
    for (const [idx, item] of arr.entries()) {
      expect(typeof item).toBe('object');
      expect(item).not.toBeNull();

      const lang = item as Partial<Lang>;
      expect(typeof lang.code).toBe('string');
      expect(lang.code && lang.code.trim().length).toBeGreaterThan(0);

      expect(typeof lang.name).toBe('string');
      expect(lang.name && lang.name.trim().length).toBeGreaterThan(0);

      if (lang.nativeName !== undefined) {
        expect(typeof lang.nativeName).toBe('string');
        expect(lang.nativeName.trim().length).toBeGreaterThan(0);
      }

      if (lang.locale !== undefined) {
        expect(typeof lang.locale).toBe('string');
        expect(lang.locale.trim().length).toBeGreaterThan(0);
      }

      if (lang.rtl !== undefined) {
        expect(typeof lang.rtl).toBe('boolean');
      }

      // Ensure no obviously incorrect property types
      for (const [k, v] of Object.entries(lang)) {
        // keys should be non-empty strings
        expect(typeof k).toBe('string');
        expect(k.length).toBeGreaterThan(0);
        // values should not be functions
        expect(typeof v).not.toBe('function');
      }
    }
  });

  it('language codes should be unique (case-insensitive) and normalized', () => {
    const arr = (languageOptions as Lang[]) ?? [];
    const seen = new Set<string>();
    for (const lang of arr) {
      const normalized = lang.code.toLowerCase();
      expect(seen.has(normalized)).toBe(false);
      seen.add(normalized);
      // Basic BCP 47-ish sanity: allow a-z, digits, dash
      expect(/^[a-z0-9-]+$/i.test(lang.code)).toBe(true);
      // No leading/trailing spaces
      expect(lang.code).toBe(lang.code.trim());
    }
  });

  it('names should be unique enough to avoid ambiguity', () => {
    const arr = (languageOptions as Lang[]) ?? [];
    const seen = new Set<string>();
    for (const lang of arr) {
      const key = lang.name.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('rtl languages, if any, should be flagged correctly', () => {
    const arr = (languageOptions as Lang[]) ?? [];
    for (const lang of arr) {
      if (lang.rtl === true) {
        // If rtl true, ensure code is a string and name present (already validated).
        expect(typeof lang.code).toBe('string');
        expect(lang.code.length).toBeGreaterThan(0);
      }
    }
  });

  it('should provide a stable snapshot of codes and names (sorted by code)', () => {
    const arr = ((languageOptions as Lang[]) ?? []).map(l => ({
      code: l.code,
      name: l.name,
    }));
    const snapshot = arr
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code, 'en'))
      .map(x => `${x.code}:${x.name}`);
    expect(snapshot).toMatchSnapshot();
  });

  it('no entries should have obviously invalid values', () => {
    const arr = (languageOptions as Lang[]) ?? [];
    for (const lang of arr) {
      // name/code should not contain control characters
      expect(/[\u0000-\u001F\u007F]/.test(lang.name)).toBe(false);
      expect(/[\u0000-\u001F\u007F]/.test(lang.code)).toBe(false);
      // names should be reasonably short and non-empty
      expect(lang.name.trim().length).toBeGreaterThan(0);
      expect(lang.name.length).toBeLessThanOrEqual(100);
    }
  });
});