import "server-only";

import type { Locale } from "./config";
import type { TranslationDictionary } from "./dictionaries/types";
import { chunkLoaders } from "./chunks/loaders";

type Cache = Partial<Record<Locale, Record<string, TranslationDictionary>>>;

const FALLBACK_LOCALE: Locale = "en";
const dictionaryCache: Cache = {};

const normalizeNamespace = (ns: string) =>
  ns
    .replace(/\./g, "/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");

async function loadChunk(locale: Locale, normalizedNamespace: string) {
  const loader = chunkLoaders[locale]?.[normalizedNamespace];
  if (!loader) {
    return null;
  }

  const cacheForLocale =
    dictionaryCache[locale] || (dictionaryCache[locale] = {});
  if (cacheForLocale[normalizedNamespace]) {
    return cacheForLocale[normalizedNamespace];
  }

  const mod = await loader();
  cacheForLocale[normalizedNamespace] = mod.default;
  return mod.default;
}

export async function getDictionary(
  locale: Locale,
  namespace: string,
): Promise<TranslationDictionary> {
  const normalized = normalizeNamespace(namespace);

  const primary = await loadChunk(locale, normalized);
  if (primary) {
    return primary;
  }

  const fallback = await loadChunk(FALLBACK_LOCALE, normalized);
  if (fallback) {
    return fallback;
  }

  // Fallback to monolithic dictionary when namespace chunk does not exist
  const mod = await import(`./dictionaries/${locale}`);
  return mod.default as TranslationDictionary;
}

export async function getMergedDictionaries(
  locale: Locale,
  namespaces: string[],
): Promise<TranslationDictionary> {
  const entries = await Promise.all(
    namespaces.map((ns) => getDictionary(locale, ns)),
  );
  return Object.assign({}, ...entries);
}
