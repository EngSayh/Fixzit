'use strict';

/**
 * Guardrail: ensure landing page translations do not contain live operational metrics.
 *
 * The check is intentionally simple: fail if any translation string contains a digit,
 * since real metrics (counts, currency, percentages) are the common leak vector.
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'i18n', 'sources', 'landing.translations.json');

function hasDigits(value) {
  return typeof value === 'string' && /\d/.test(value);
}

function walk(value, keyPath, offenders) {
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, `${keyPath}[${idx}]`, offenders));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => walk(v, keyPath ? `${keyPath}.${k}` : k, offenders));
  } else if (hasDigits(value)) {
    offenders.push(keyPath || '<root>');
  }
}

try {
  if (!fs.existsSync(TARGET)) {
    console.log('ℹ️  landing translations not found; skipping metric guard.');
    process.exit(0);
  }

  const json = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
  const offenders = [];
  walk(json, '', offenders);

  if (offenders.length > 0) {
    console.error('❌ Landing translations contain numeric values (potential live metrics):');
    offenders.slice(0, 20).forEach((k) => console.error(` - ${k}`));
    if (offenders.length > 20) {
      console.error(` ...and ${offenders.length - 20} more`);
    }
    process.exit(1);
  }

  console.log('✅ Landing translations clean (no live-looking metrics detected).');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to scan landing translations:', error);
  process.exit(1);
}
