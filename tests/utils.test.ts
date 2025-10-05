/**
 * Unit tests for generateSlug.
 * Framework: @playwright/test (root playwright.config.ts -> testDir: './tests')
 * Style: Node-only tests (no browser fixture).
 */
import { test, expect } from '@playwright/test';
import { generateSlug } from '@/lib/utils';

test.describe('generateSlug', () => {
  test('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  test('lowercases all characters', () => {
    expect(generateSlug('HeLLo WoRLD')).toBe('hello-world');
  });

  test('trims surrounding whitespace', () => {
    expect(generateSlug('   spaced   ')).toBe('spaced');
  });

  test('converts internal whitespace sequences (spaces/tabs/newlines) to single hyphen', () => {
    expect(generateSlug('a   b\tc\nd')).toBe('a-b-c-d');
  });

  test('collapses multiple hyphens to a single hyphen', () => {
    expect(generateSlug('a---b----c')).toBe('a-b-c');
  });

  test('preserves single hyphens inside text', () => {
    expect(generateSlug('already-slug')).toBe('already-slug');
  });

  test('does not strip leading or trailing hyphens if they exist after normalization', () => {
    expect(generateSlug(' --Hello-- ')).toBe('-hello-');
  });

  test('removes disallowed punctuation and symbols', () => {
    expect(generateSlug('Hello, world\! @2025 #dev')).toBe('hello-world-2025-dev');
  });

  test('removes underscores instead of treating them as separators', () => {
    expect(generateSlug('Hello__World')).toBe('helloworld');
  });

  test('strips non-ASCII letters (no transliteration)', () => {
    expect(generateSlug('Café Déjà Vu')).toBe('caf-dj-vu');
    expect(generateSlug('naïve façade rôle')).toBe('nave-faade-rle');
  });

  test('keeps digits and separates them around spaces', () => {
    expect(generateSlug('123 abc 456')).toBe('123-abc-456');
  });

  test('handles only-whitespace inputs', () => {
    expect(generateSlug('    ')).toBe('');
  });

  test('handles newline and tab whitespace', () => {
    expect(generateSlug('\nTabbed\tName\r')).toBe('tabbed-name');
  });

  test('non-Latin characters only produce empty slug', () => {
    expect(generateSlug('你好 мир مرحبا')).toBe('');
  });

  test('is idempotent (running twice yields same result)', () => {
    const once = generateSlug('This  -- is   A TEST\!\!\!');
    const twice = generateSlug(once);
    expect(twice).toBe(once);
  });

  test('gracefully handles undefined and null at runtime', () => {
    expect((generateSlug as any)(undefined)).toBe('');
    expect((generateSlug as any)(null)).toBe('');
  });

  test('handles very long inputs efficiently (sanity checks)', () => {
    const long = ('A\! ').repeat(5000); // large input
    const result = generateSlug(long);
    expect(result.length).toBeGreaterThan(0);
    expect(result.startsWith('a')).toBeTruthy();
    expect(result.endsWith('a')).toBeTruthy();
    expect(result.includes('--')).toBeFalsy(); // no double hyphens after collapse
  });
});