/**
 * English Translation Dictionary (Lightweight Shim)
 * 
 * This file loads translations from generated JSON at runtime.
 * Previously contained 28k+ lines of TypeScript literals that caused VS Code to consume gigabytes.
 * 
 * Source of truth: i18n/sources/*.translations.json (1,168 modular domain files)
 * Generated artifact: i18n/generated/en.dictionary.json (created by build script)
 * 
 * @see scripts/generate-dictionaries-json.ts
 * @see scripts/flatten-base-dictionaries.ts
 */

import type { TranslationDictionary } from './types';

// Use generated JSON in production/server runtime
let cachedDict: TranslationDictionary | null = null;

function loadDictionary(): TranslationDictionary {
  if (cachedDict) return cachedDict;
  
  try {
    // Try loading from generated JSON (server-side)
    if (typeof require !== 'undefined') {
      const path = require('path');
      const fs = require('fs');
      const jsonPath = path.resolve(__dirname, '../generated/en.dictionary.json');
      
      if (fs.existsSync(jsonPath)) {
        cachedDict = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return cachedDict!;
      }
    }
    
    // Fallback: Load from generated JSON in client context
    // (This path is used in build/runtime contexts)
    throw new Error(
      'en.dictionary.json not found. Run: npm run i18n:build'
    );
  } catch (error) {
    console.error('[i18n] Failed to load English dictionary:', error);
    
    // Return minimal fallback to prevent crashes
    return {
      common: {
        appName: 'Fixzit Enterprise',
        brand: 'FIXZIT ENTERPRISE',
        actions: {
          save: 'Save',
          cancel: 'Cancel',
          close: 'Close',
          add: 'Add',
          edit: 'Edit',
          delete: 'Delete',
        },
        search: 'Search',
        loading: 'Loading...',
        error: 'Error',
      },
    } as TranslationDictionary;
  }
}

// Export lazily-loaded dictionary
const en: TranslationDictionary = new Proxy({} as TranslationDictionary, {
  get(target, prop: string) {
    const dict = loadDictionary();
    return dict[prop];
  },
  ownKeys() {
    const dict = loadDictionary();
    return Reflect.ownKeys(dict);
  },
  has(target, prop) {
    const dict = loadDictionary();
    return prop in dict;
  },
  getOwnPropertyDescriptor(target, prop) {
    const dict = loadDictionary();
    return Object.getOwnPropertyDescriptor(dict, prop);
  }
});

export default en;
