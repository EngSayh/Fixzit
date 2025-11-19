import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n/I18nProvider';
import { TranslationProvider } from '@/contexts/TranslationContext';
import LandingPage from '@/app/page';

const ORIGINAL_FETCH = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as typeof fetch;
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('LandingPage translations', () => {
  it('renders Arabic hero CTA when locale is Arabic', async () => {
    render(
      <I18nProvider initialLocale="ar">
        <TranslationProvider>
          <LandingPage />
        </TranslationProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('احجز عرضًا مباشرًا')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('renders English hero CTA when locale is English', async () => {
    render(
      <I18nProvider initialLocale="en">
        <TranslationProvider>
          <LandingPage />
        </TranslationProvider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Book a live demo')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
