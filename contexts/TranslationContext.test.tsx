/**
 * Tests for TranslationProvider and useTranslation
 *
 * Detected testing stack: Jest + React Testing Library (RTL).
 * - If the project uses Vitest, replace jest.fn with vi.fn and adjust imports as needed.
 *
 * This suite validates:
 * - Provider passes initialLocale and renders children.
 * - Hook derives language, locale format mapping, and isRTL correctly.
 * - setLanguage forwards Locale directly to setLocale (from useI18n).
 * - setLocale(string) normalizes arbitrary strings to 'ar' or 'en'.
 * - t(key, fallback) returns fallback when untranslated; returns translation otherwise.
 */

import React, { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

// We will mock both I18nProvider (to assert the initialLocale prop and children render)
// and useI18n (to simulate locale/dir/t/setLocale behavior used by the hook).
jest.mock('@/i18n/I18nProvider', () => {
  // A pass-through component that exposes initialLocale for assertions.
  return {
    I18nProvider: ({ initialLocale, children }: { initialLocale?: any; children: ReactNode }) => (
      <div data-testid="i18n-provider" data-initial-locale={String(initialLocale)}>
        {children}
      </div>
    ),
  };
});

// Provide mutable test doubles for the hook values so each test can customize.
let mockLocale: 'en' | 'ar' = 'en';
let mockDir: 'ltr' | 'rtl' = 'ltr';
const mockSetLocale = jest.fn();
let mockTranslateImpl: (key: string) => string = (k) => 'translated:' + k;

jest.mock('@/i18n/useI18n', () => {
  return {
    useI18n: () => ({
      locale: mockLocale,
      dir: mockDir,
      t: (key: string) => mockTranslateImpl(key),
      setLocale: mockSetLocale,
    }),
  };
});

// For DEFAULT_LOCALE used by TranslationProvider default prop,
// we set a stable value so the test can assert it deterministically.
jest.mock('@/i18n/config', () => {
  return {
    DEFAULT_LOCALE: 'en',
  };
});

import { TranslationProvider, useTranslation } from './TranslationContext';

function HookProbe({
  probe,
}: {
  probe: (values: ReturnType<typeof useTranslation>) => void;
}) {
  const values = useTranslation();
  // invoke the probe callback to allow tests to capture values
  probe(values);
  return <div data-testid="hook-probe">ok</div>;
}

describe('TranslationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default hook state
    mockLocale = 'en';
    mockDir = 'ltr';
    mockTranslateImpl = (k) => 'translated:' + k;
  });

  it('renders children and passes through the provided initialLocale', () => {
    render(
      <TranslationProvider>
        <div data-testid="child">child</div>
      </TranslationProvider>
    );

    const provider = screen.getByTestId('i18n-provider');
    expect(provider).toBeInTheDocument();
    expect(provider).toHaveAttribute('data-initial-locale', 'ar');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('uses DEFAULT_LOCALE when initialLocale is not provided', () => {
    render(
      <TranslationProvider>
        <div data-testid="child">child</div>
      </TranslationProvider>
    );

    const provider = screen.getByTestId('i18n-provider');
    // DEFAULT_LOCALE mocked as 'en' above
    expect(provider).toHaveAttribute('data-initial-locale', 'en');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('useTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'en';
    mockDir = 'ltr';
    mockTranslateImpl = (k) => 'translated:' + k;
  });

  function renderWithProvider(probe: (v: ReturnType<typeof useTranslation>) => void) {
    render(
      <TranslationProvider>
        <HookProbe probe={probe} />
      </TranslationProvider>
    );
  }

  it('exposes language matching useI18n.locale and derived locale format (en -> en-GB)', () => {
    mockLocale = 'en';
    let captured: ReturnType<typeof useTranslation> | null = null;

    renderWithProvider((v) => {
      captured = v;
    });

    expect(captured).toBeTruthy();
    expect(captured!.language).toBe('en');
    expect(captured!.locale).toBe('en-GB');
    expect(captured!.isRTL).toBe(false);
  });

  it('maps ar -> ar-SA and sets isRTL when dir=rtl', () => {
    mockLocale = 'ar';
    mockDir = 'rtl';
    let captured: ReturnType<typeof useTranslation> | null = null;

    renderWithProvider((v) => {
      captured = v;
    });

    expect(captured).toBeTruthy();
    expect(captured!.language).toBe('ar');
    expect(captured!.locale).toBe('ar-SA');
    expect(captured!.isRTL).toBe(true);
  });

  it('setLanguage forwards Locale directly to useI18n.setLocale', () => {
    mockLocale = 'en';
    let captured: ReturnType<typeof useTranslation> | null = null;

    renderWithProvider((v) => {
      captured = v;
    });

    captured!.setLanguage('ar' as any);
    expect(mockSetLocale).toHaveBeenCalledTimes(1);
    expect(mockSetLocale).toHaveBeenCalledWith('ar');
  });

  describe('setLocale(string) normalization', () => {
    it('normalizes arabic variants to "ar"', () => {
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      captured!.setLocale('ar');
      captured!.setLocale('AR');
      captured!.setLocale('ar-sa');
      captured!.setLocale('ar_SA');
      expect(mockSetLocale).toHaveBeenCalledTimes(4);
      expect(mockSetLocale).toHaveBeenNthCalledWith(1, 'ar');
      expect(mockSetLocale).toHaveBeenNthCalledWith(2, 'ar');
      expect(mockSetLocale).toHaveBeenNthCalledWith(3, 'ar');
      expect(mockSetLocale).toHaveBeenNthCalledWith(4, 'ar');
    });

    it('normalizes non-arabic or unknown to "en"', () => {
      jest.clearAllMocks();
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      captured!.setLocale('en');
      captured!.setLocale('EN');
      captured!.setLocale('en-gb');
      captured!.setLocale('fr');
      captured!.setLocale('pt-BR');
      captured!.setLocale(''); // empty string edge case
      expect(mockSetLocale).toHaveBeenCalledTimes(6);
      for (let i = 1; i <= 6; i++) {
        expect(mockSetLocale).toHaveBeenNthCalledWith(i, 'en');
      }
    });
  });

  describe('t(key, fallback)', () => {
    it('returns translated value when translator provides one', () => {
      mockTranslateImpl = (k) => 'TX:' + k;
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      const result = captured!.t('greet');
      expect(result).toBe('TX:greet');
    });

    it('returns fallback when translation equals key and fallback provided', () => {
      mockTranslateImpl = (k) => k; // unresolved translation
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      const result = captured!.t('missing_key', 'Hello');
      expect(result).toBe('Hello');
    });

    it('returns key when translation equals key and no fallback provided', () => {
      mockTranslateImpl = (k) => k; // unresolved translation
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      const result = captured!.t('missing_key');
      expect(result).toBe('missing_key');
    });
  });
});
