/**
 * Arabic Translation Dictionary (Client-Safe)
 * 
 * This file re-exports the generated JSON dictionary.
 * Previously tried to use fs which fails on client-side.
 * 
 * Source of truth: i18n/sources/*.translations.json (1,168 modular domain files)
 * Generated artifact: i18n/generated/ar.dictionary.json (created by build script)
 * 
 * @see scripts/generate-dictionaries-json.ts
 * @see scripts/flatten-base-dictionaries.ts
 */

import arDictionary from '../generated/ar.dictionary.json';

// Re-export the JSON dictionary directly
// This works on both client and server without fs
export default arDictionary;
