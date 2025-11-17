#!/usr/bin/env python3
"""Generate EN + AR translations for missing keys based on audit report."""
from __future__ import annotations
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, Tuple

try:
    from googletrans import Translator  # type: ignore
except ImportError as exc:  # pragma: no cover
    print("googletrans is required. Install via `python3 -m pip install googletrans==4.0.0rc1`.", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parents[1]
AUDIT_JSON = ROOT / 'docs' / 'translations' / 'translation-audit.json'
ARTIFACT = ROOT / '_artifacts' / 'generated-translations.json'
NEW_TS = ROOT / 'i18n' / 'new-translations.ts'

MANUAL_EN: Dict[str, str] = {
    'marketplace.claims.buyer.title': 'Buyer claims',
    'marketplace.claims.buyer.subtitle': 'Track every claim you have filed and monitor status updates',
    'marketplace.claims.buyer.newClaim': 'File new claim',
    'marketplace.claims.seller.title': 'Seller claims desk',
    'marketplace.claims.seller.subtitle': 'Review open disputes and respond before deadlines',
    'marketplace.claims.seller.importantNotice': 'Important notice',
    'marketplace.claims.seller.responseDeadline': 'Respond within 3 calendar days to avoid automatic resolutions',
    'marketplace.claims.seller.respondToClaim': 'Respond to claim',
    'marketplace.claims.seller.respondToClaimSubtitle': 'Provide documentation, refunds, or counter evidence to resolve the dispute',
    'marketplace.settlements.withdrawalSuccess': 'Withdrawal submitted successfully',
    'marketplace.settlements.pleaseLogin': 'Please sign in to view settlements',
    'marketplace.settlements.mustBeSeller': 'You must be a registered seller to access settlements',
    'marketplace.settlements.loading': 'Loading settlements...',
    'marketplace.settlements.title': 'Seller settlements',
    'marketplace.settlements.tabs.transactions': 'Transactions',
    'marketplace.settlements.tabs.statements': 'Statements',
    'marketplace.settlements.comingSoon': 'Statements export coming soon',
}

# Pre-translated Arabic overrides for sensitive system text
MANUAL_AR: Dict[str, str] = {
    'marketplace.claims.buyer.title': 'مطالبات المشتري',
    'marketplace.claims.buyer.subtitle': 'تتبع كل مطالبة قدمتها وراقب تحديثات الحالة',
    'marketplace.claims.buyer.newClaim': 'تقديم مطالبة جديدة',
    'marketplace.claims.seller.title': 'مكتب مطالبات البائع',
    'marketplace.claims.seller.subtitle': 'راجع النزاعات المفتوحة واستجب قبل المهل الزمنية',
    'marketplace.claims.seller.importantNotice': 'تنبيه هام',
    'marketplace.claims.seller.responseDeadline': 'يجب الرد خلال ٣ أيام تقويمية لتجنب الحسم التلقائي',
    'marketplace.claims.seller.respondToClaim': 'الرد على المطالبة',
    'marketplace.claims.seller.respondToClaimSubtitle': 'قدّم المستندات أو المبالغ المستردة أو الأدلة المضادة لحل النزاع',
    'marketplace.settlements.withdrawalSuccess': 'تم إرسال طلب السحب بنجاح',
    'marketplace.settlements.pleaseLogin': 'الرجاء تسجيل الدخول لعرض التسويات',
    'marketplace.settlements.mustBeSeller': 'يجب أن تكون بائعاً مسجلاً للوصول إلى التسويات',
    'marketplace.settlements.loading': 'جاري تحميل التسويات...',
    'marketplace.settlements.title': 'تسويات البائع',
    'marketplace.settlements.tabs.transactions': 'المعاملات',
    'marketplace.settlements.tabs.statements': 'الكشوفات',
    'marketplace.settlements.comingSoon': 'تصدير الكشوفات قادم قريباً',
}

PLACEHOLDER_RE = re.compile(r"{{[^}]+}}")

def mask_placeholders(text: str) -> Tuple[str, Dict[str, str]]:
    replacements: Dict[str, str] = {}
    def _repl(match: re.Match[str]) -> str:
        token = f"__PH{len(replacements)}__"
        replacements[token] = match.group(0)
        return token
    masked = PLACEHOLDER_RE.sub(_repl, text)
    return masked, replacements

def restore_placeholders(text: str, mapping: Dict[str, str]) -> str:
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text

def find_fallback(key: str, files: list[str]) -> str | None:
    pattern = re.compile(rf"t\(\s*['\"]{re.escape(key)}['\"]\s*,\s*['\"]([^'\"]+)" )
    for file in files:
        path = Path(file)
        if not path.exists():
            continue
        try:
            content = path.read_text(encoding='utf-8')
        except Exception:
            continue
        match = pattern.search(content)
        if match:
            return match.group(1)
    return None

def load_missing() -> Dict[str, Dict[str, str]]:
    if not AUDIT_JSON.exists():
        raise SystemExit(f"Audit file not found at {AUDIT_JSON}")
    audit = json.loads(AUDIT_JSON.read_text(encoding='utf-8'))
    data: Dict[str, Dict[str, str]] = {}
    translator = Translator()

    missing_entries = audit.get('missing', {}).get('used', [])
    for entry in missing_entries:
        key = entry['key']
        fallback = MANUAL_EN.get(key)
        if not fallback:
            fallback = find_fallback(key, entry.get('files', []))
        if not fallback:
            # fall back to key label transformed
            fallback = key.split('.')[-1].replace('_', ' ').replace('-', ' ').title()
        en_text = fallback
        ar_text = MANUAL_AR.get(key)
        if not ar_text:
            masked, placeholders = mask_placeholders(en_text)
            translated = translator.translate(masked, src='en', dest='ar').text
            ar_text = restore_placeholders(translated, placeholders)
        data[key] = {'en': en_text, 'ar': ar_text}
    return data

def write_ts(entries: Dict[str, Dict[str, str]]) -> None:
    lines = [
        '/* Auto-generated via scripts/generate_missing_translations.py */',
        'export const newTranslations = {',
        '  en: {'
    ]
    for key in sorted(entries):
        en_val = entries[key]['en'].replace('\\', '\\\\').replace("'", "\\'")
        lines.append(f"    '{key}': '{en_val}',")
    lines.append('  },')
    lines.append('  ar: {')
    for key in sorted(entries):
        ar_val = entries[key]['ar'].replace('\\', '\\\\').replace("'", "\\'")
        lines.append(f"    '{key}': '{ar_val}',")
    lines.append('  },')
    lines.append('} as const;')
    NEW_TS.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def write_artifact(entries: Dict[str, Dict[str, str]]) -> None:
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')


def update_locale_json(entries: Dict[str, Dict[str, str]]) -> None:
    for lang in ('en', 'ar'):
        path = ROOT / 'i18n' / f'{lang}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        for key, payload in entries.items():
            segments = key.split('.')
            cursor = data
            for seg in segments[:-1]:
                next_node = cursor.get(seg)
                if not isinstance(next_node, dict):
                    cursor[seg] = {}
                    next_node = cursor[seg]
                cursor = next_node
            cursor[segments[-1]] = payload[lang]
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    entries = load_missing()
    write_ts(entries)
    write_artifact(entries)
    update_locale_json(entries)
    print(f"Generated {len(entries)} translations.")
    print(f"Updated {NEW_TS.relative_to(ROOT)} and locale JSON files.")


if __name__ == '__main__':
    main()
