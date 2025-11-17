import { useTranslation } from '@/contexts/TranslationContext';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'text';

export const useAutoTranslator = (scope: string) => {
  const { t } = useTranslation();
  return (fallback: string, id?: string) => {
    const slug = id ? slugify(id) : slugify(fallback);
    return t(`auto.${scope}.${slug}`, fallback);
  };
};
