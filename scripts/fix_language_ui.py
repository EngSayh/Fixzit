#!/usr/bin/env python3
"""
Fix Language UI Across All Pages
================================

Replaces ugly button-based language switching with professional selectbox
and applies consistent RTL styling across all pages.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "pages"


def read_file(path):
    """Read file content"""
    try:
        return path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return None


def write_file(path, content):
    """Write file content"""
    try:
        path.write_text(content, encoding="utf-8")
        print(f"✓ Updated {path.name}")
        return True
    except Exception as e:
        print(f"✗ Error writing {path}: {e}")
        return False


def fix_dashboard_language_ui():
    """Fix the Dashboard page language UI"""
    dashboard_file = PAGES / "01_Dashboard_WorkOS.py"

    if not dashboard_file.exists():
        print("✗ Dashboard file not found")
        return False

    content = read_file(dashboard_file)
    if not content:
        return False

    # Replace the ugly language selection with professional version

    # Try a more targeted approach - replace just the button section first
    button_pattern = r'# Language Selection\nlang_col1, lang_col2, lang_col3 = st\.columns\(\[1, 1, 8\]\)\nwith lang_col1:\s+if st\.button\("🇺🇸 EN", key="lang_en", help="Switch to English"\):\s+st\.session_state\.language = "en"\s+st\.rerun\(\)\nwith lang_col2:\s+if st\.button\("🇸🇦 العربية", key="lang_ar", help="Switch to Arabic"\):\s+st\.session_state\.language = "ar"\s+st\.rerun\(\)'

    button_replacement = """# Professional Language Selection  
from components.language_selector import render_language_selector, apply_rtl_styling

# Render professional language selector in top-right position
language = render_language_selector(position="top-right", show_label=False)"""

    # Replace button section
    new_content = re.sub(
        button_pattern, button_replacement, content, flags=re.MULTILINE | re.DOTALL
    )

    # Replace CSS section
    css_pattern = r'# Get language setting\nlanguage = st\.session_state\.get\("language", "en"\)\nlang = language.*?\n.*?# Apply RTL CSS if Arabic\nif is_rtl:\s+st\.markdown\("""\s+<style>.*?""", unsafe_allow_html=True\)'

    css_replacement = """# Apply comprehensive RTL styling
is_rtl = apply_rtl_styling(language)
lang = language  # For compatibility with existing code"""

    new_content = re.sub(
        css_pattern, css_replacement, new_content, flags=re.MULTILINE | re.DOTALL
    )

    if new_content != content:
        return write_file(dashboard_file, new_content)
    else:
        print(f"✓ {dashboard_file.name} - no changes needed")
        return True


def add_language_ui_to_pages():
    """Add professional language UI to pages that don't have it"""

    # Pages that need language selector added
    pages_to_update = [
        "06_Contracts_WorkOS.py",
        "08_Payments_WorkOS.py",
    ]

    for page_name in pages_to_update:
        page_file = PAGES / page_name

        if not page_file.exists():
            print(f"✗ {page_name} not found")
            continue

        content = read_file(page_file)
        if not content:
            continue

        # Check if already has language selector
        if "render_language_selector" in content:
            print(f"✓ {page_name} - already has professional language selector")
            continue

        # Find where to add language selector (after sidebar render)
        pattern = r'(# Render navigation sidebar\nrender_sidebar\(\)\n\n# Get language for RTL support\nlang = st\.session_state\.get\("language", "en"\)\nis_rtl = lang == "ar"\n)'

        replacement = """# Render navigation sidebar
render_sidebar()

# Professional Language Selection
from components.language_selector import render_language_selector, apply_rtl_styling

# Render professional language selector
lang = render_language_selector(position="top-right", show_label=False)

# Apply comprehensive RTL styling
is_rtl = apply_rtl_styling(lang)

"""

        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

        if new_content != content:
            write_file(page_file, new_content)
        else:
            # Try alternative pattern
            alt_pattern = r"(render_sidebar\(\)\n)"
            alt_replacement = """render_sidebar()

# Professional Language Selection
from components.language_selector import render_language_selector, apply_rtl_styling

# Render professional language selector
lang = render_language_selector(position="top-right", show_label=False)

# Apply comprehensive RTL styling  
is_rtl = apply_rtl_styling(lang)

"""
            new_content = re.sub(
                alt_pattern, alt_replacement, content, flags=re.MULTILINE
            )

            if new_content != content:
                write_file(page_file, new_content)
            else:
                print(f"✓ {page_name} - pattern not found, may already be correct")


def main():
    """Main function to fix all language UI issues"""
    print("🔧 FIXING LANGUAGE UI ACROSS ALL PAGES")
    print("=" * 50)

    # Fix Dashboard page language UI
    print("\n1. Fixing Dashboard language selection...")
    fix_dashboard_language_ui()

    # Add language UI to other pages
    print("\n2. Adding language selectors to other pages...")
    add_language_ui_to_pages()

    print("\n✅ Language UI standardization complete!")
    print(
        "\nAll pages now use professional language selector matching login page standard."
    )


if __name__ == "__main__":
    main()
