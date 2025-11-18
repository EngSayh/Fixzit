import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ar from '../i18n/dictionaries/ar';
import en from '../i18n/dictionaries/en';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'i18n', 'generated');

type DictionaryPayload = Record<string, unknown>;

function writeDictionary(locale: string, payload: DictionaryPayload) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, `${locale}.dictionary.json`);
  writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf-8');
  console.log(`✓ Wrote ${filePath}`);
}

writeDictionary('en', en as DictionaryPayload);
writeDictionary('ar', ar as DictionaryPayload);
