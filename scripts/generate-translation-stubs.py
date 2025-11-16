#!/usr/bin/env python3
"""
Generate Translation Stub Files
Creates i18n files for FR, PT, RU, ES, UR, HI, ZH with English fallbacks
"""

import json
import shutil
from pathlib import Path

# Base directory
i18n_dir = Path('/Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit/i18n')

# Load English as the base
with open(i18n_dir / 'en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Language metadata
languages = {
    'fr': {'name': 'French', 'notice': 'Traductions françaises à venir'},
    'pt': {'name': 'Portuguese', 'notice': 'Traduções em português em breve'},
    'ru': {'name': 'Russian', 'notice': 'Русские переводы скоро появятся'},
    'es': {'name': 'Spanish', 'notice': 'Traducciones en español próximamente'},
    'ur': {'name': 'Urdu', 'notice': 'اردو ترجمہ جلد آرہا ہے'},
    'hi': {'name': 'Hindi', 'notice': 'हिन्दी अनुवाद जल्द ही आ रहे हैं'},
    'zh': {'name': 'Chinese', 'notice': '中文翻译即将推出'},
}

print("🌍 Generating Translation Stub Files")
print("=" * 50)

for lang_code, metadata in languages.items():
    lang_file = i18n_dir / f'{lang_code}.json'
    
    # Create stub data with English fallback + notice
    stub_data = {
        **en_data,
        '_metadata': {
            'language': lang_code,
            'languageName': metadata['name'],
            'status': 'stub',
            'notice': metadata['notice'],
            'fallbackLanguage': 'en',
            'lastUpdated': '2025-11-16',
            'translationCoverage': '0%',
            'description': f'{metadata["name"]} translations - Currently using English fallbacks. Translations coming soon.'
        }
    }
    
    # Write to file
    with open(lang_file, 'w', encoding='utf-8') as f:
        json.dump(stub_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Created: {lang_code}.json ({metadata['name']})")
    print(f"   Notice: {metadata['notice']}")

print()
print("✅ All translation stub files created successfully!")
print()
print("📝 Next steps:")
print("   1. Professional translators can now populate these files")
print("   2. Update '_metadata.translationCoverage' as translation progresses")
print("   3. English fallbacks ensure the app works in all languages immediately")
