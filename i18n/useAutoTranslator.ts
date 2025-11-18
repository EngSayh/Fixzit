import { useTranslation } from '@/contexts/TranslationContext';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'text';

type InterpolationParams = Record<string, string | number | undefined | null>;

const interpolate = (template: string, params?: InterpolationParams) => {
  if (!params) {
    return template;
  }

  let result = template;
  let replaced = false;

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    const placeholder = `{{${key}}}`;
    if (result.includes(placeholder)) {
      result = result.split(placeholder).join(String(value));
      replaced = true;
    }
  }

  if (!replaced) {
    const supplemental = Object.values(params)
      .filter((value): value is string | number => value !== undefined && value !== null && value !== '')
      .map((value) => String(value))
      .join(', ');

    if (supplemental) {
      const trimmed = result.trimEnd();
      const separator = /[.!?]$/.test(trimmed) ? ' ' : ': ';
      result = `${trimmed}${separator}${supplemental}`;
    }
  }

  return result;
};

export const useAutoTranslator = (scope: string) => {
  const { t } = useTranslation();
  return (fallback: string, id?: string, params?: InterpolationParams) => {
    const slug = id ? slugify(id) : slugify(fallback);
    const template = t(`auto.${scope}.${slug}`, fallback);
    return interpolate(template, params);
  };
};
