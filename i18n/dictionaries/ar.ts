/**
 * Arabic Translation Dictionary (Lightweight Shim)
 * 
 * This file loads translations from generated JSON at runtime.
 * Previously contained 28k+ lines of TypeScript literals that caused VS Code to consume gigabytes.
 * 
 * Source of truth: i18n/sources/*.translations.json (1,168 modular domain files)
 * Generated artifact: i18n/generated/ar.dictionary.json (created by build script)
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
      const jsonPath = path.resolve(__dirname, '../generated/ar.dictionary.json');
      
      if (fs.existsSync(jsonPath)) {
        cachedDict = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return cachedDict!;
      }
    }
    
    // Fallback: Load from generated JSON in client context
    // (This path is used in build/runtime contexts)
    throw new Error(
      'ar.dictionary.json not found. Run: npm run i18n:build'
    );
  } catch (error) {
    console.error('[i18n] Failed to load Arabic dictionary:', error);
    
    // Return minimal fallback to prevent crashes
    return {
      common: {
        appName: 'فيكزت إنتربرايز',
        brand: 'فيكزيت إنتربرايز',
        actions: {
          save: 'حفظ',
          cancel: 'إلغاء',
          close: 'إغلاق',
          add: 'إضافة',
          edit: 'تعديل',
          delete: 'حذف',
        },
        search: 'بحث',
        loading: 'جاري التحميل...',
        error: 'خطأ',
      },
    } as TranslationDictionary;
  }
}

// Export lazily-loaded dictionary
const ar: TranslationDictionary = new Proxy({} as TranslationDictionary, {
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

export default ar;
