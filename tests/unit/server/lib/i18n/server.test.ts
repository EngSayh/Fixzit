import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerI18n, getServerTranslation } from '@/lib/i18n/server';
import { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';

vi.mock('next/headers', () => {
  return {
    cookies: vi.fn(),
    headers: vi.fn(),
  };
});

const mockedCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockedHeaders = headers as unknown as ReturnType<typeof vi.fn>;

describe('lib/i18n/server', () => {
  beforeEach(() => {
    mockedCookies.mockReset();
    mockedHeaders.mockReset();
    mockedHeaders.mockReturnValue({
      get: () => null,
    });
  });

  it('returns Arabic translations, RTL flag, and locale from getServerI18n()', async () => {
    mockedCookies.mockReturnValue({
      get: (key: string) => {
        if (key === 'fxz.lang') {
          return { value: 'ar-SA' };
        }
        return undefined;
      },
    });
    mockedHeaders.mockReturnValue({
      get: (name: string) => (name === 'accept-language' ? 'ar-SA,ar;q=0.9' : null),
    });

    const { t, isRTL, locale } = await getServerI18n();

    expect(t('landing.hero.actions.bookDemo', 'Book a live demo')).toBe('احجز عرضًا مباشرًا');
    expect(isRTL).toBe(true);
    expect(locale).toBe('ar');
  });

  it('defaults to Arabic when cookies/headers missing (APP_DEFAULTS)', async () => {
    mockedCookies.mockReturnValue({
      get: () => undefined,
    });
    mockedHeaders.mockReturnValue({
      get: () => null,
    });

    const { t, isRTL, locale } = await getServerI18n();

    expect(t('landing.hero.actions.bookDemo', 'Book a live demo')).toBe('احجز عرضًا مباشرًا');
    expect(isRTL).toBe(true);
    expect(locale).toBe('ar');
  });

  it('getServerTranslation() returns Arabic strings for NextRequest', async () => {
    const req = new NextRequest('https://example.com', {
      headers: {
        'accept-language': 'ar-SA,ar;q=0.9',
      },
    });

    const translate = await getServerTranslation(req);

    expect(translate('landing.hero.title.line1', 'Operate properties with calm.')).toBe('شغّل العقارات بهدوء.');
  });
});
