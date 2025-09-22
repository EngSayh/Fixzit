// src/i18n/server.ts
import type { Lang } from './config';

export async function getServerDictionary(lang: Lang) {
  if (lang === 'ar') {
    const { default: ar } = await import('./dictionaries/ar');
    return ar;
  }
  const { default: en } = await import('./dictionaries/en');
  return en;
}
