import { useContext, useMemo } from 'react';
import { I18nContext } from './I18nProvider';

type Dict = Record<string, unknown>;

const drill = (path: string, dict: Dict): unknown =>
  path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Dict)[segment];
    }
    return undefined;
  }, dict);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within <I18nProvider />');
  }

  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) => {
      const raw = drill(key, ctx.dict) ?? key;
      if (typeof raw !== 'string') {
        return key;
      }

      if (!vars) {
        return raw;
      }

      return Object.keys(vars).reduce((acc, token) => {
        return acc.replace(new RegExp(`{${token}}`, 'g'), String(vars[token]));
      }, raw);
    },
    [ctx.dict]
  );

  return { ...ctx, t };
}

export type UseI18nReturn = ReturnType<typeof useI18n>;
