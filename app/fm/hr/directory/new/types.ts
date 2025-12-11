import type { TranslationDictionary } from "@/i18n/dictionaries/types";

export type EmployeeDraft = {
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  workModel: string;
  reportsTo: string;
  startDate: string;
  phone: string;
  compensationType: string;
  salary: string;
  notes: string;
};

export type Lookups = {
  departments: string[];
  employmentTypes: string[];
  workModels: string[];
  compensationTypes: string[];
};

type InterpolationValues = Record<string, string | number | undefined>;

const interpolate = (template: string, values?: InterpolationValues) => {
  if (!values) return template;
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
    const value = values[token.trim()];
    return value === undefined ? "" : String(value);
  });
};

const resolveMessage = (dictionary: TranslationDictionary, key: string) => {
  const direct = dictionary[key];
  if (typeof direct === "string") {
    return direct;
  }

  const segments = key.split(".");
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (
      current &&
      typeof current === "object" &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
};

export type TranslateFn = (
  key: string,
  fallback: string,
  values?: InterpolationValues,
) => string;

export function createScopedTranslator(
  dictionary: TranslationDictionary,
): TranslateFn {
  return (key: string, fallback: string, values?: InterpolationValues) => {
    const template = resolveMessage(dictionary, key) ?? fallback ?? key;
    return interpolate(template, values);
  };
}
