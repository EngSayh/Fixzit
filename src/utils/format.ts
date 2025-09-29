import type { Locale } from '@/src/i18n/config';

export const fmtNumber = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB').format(value);

export const fmtDate = (
  input: Date | number | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', options ?? { dateStyle: 'medium' }).format(date);
};
