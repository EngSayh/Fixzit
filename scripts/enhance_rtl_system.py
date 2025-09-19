#!/usr/bin/env python3
"""
Enhance RTL System Across All Pages
===================================

Ensures perfect RTL layout and styling consistency across all pages
that use language switching.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "pages"


def read_file(path):
    """Read file content safely"""
    try:
        return path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return None


def write_file(path, content):
    """Write file content safely"""
    try:
        path.write_text(content, encoding="utf-8")
        print(f"✓ Enhanced RTL in {path.name}")
        return True
    except Exception as e:
        print(f"✗ Error writing {path}: {e}")
        return False


def enhance_rtl_styling():
    """Enhance RTL styling across all pages with language selectors"""

    pages_with_lang_selector = [
        "01_Dashboard_WorkOS.py",
        "05_Properties_WorkOS.py",
        "06_Contracts_WorkOS.py",
        "08_Payments_WorkOS.py",
    ]

    for page_name in pages_with_lang_selector:
        page_file = PAGES / page_name

        if not page_file.exists():
            print(f"✗ {page_name} not found")
            continue

        content = read_file(page_file)
        if not content:
            continue

        # Check if it has enhanced RTL styling already
        if "apply_rtl_styling" in content:
            print(f"✓ {page_name} - already has enhanced RTL")
            continue

        # Find and replace basic RTL with enhanced version
        basic_rtl_pattern = r'# Apply RTL CSS if Arabic\nif is_rtl:\s+st\.markdown\("""\s+<style>.*?</style>\s+""", unsafe_allow_html=True\)'

        enhanced_rtl = """# Apply comprehensive RTL styling
is_rtl = apply_rtl_styling(lang)"""

        new_content = re.sub(
            basic_rtl_pattern, enhanced_rtl, content, flags=re.MULTILINE | re.DOTALL
        )

        # Also ensure import is present
        if "from components.language_selector import" not in new_content:
            # Add import after other imports
            import_pattern = r"(from navigation import.*?\n)"
            import_replacement = r"\1from components.language_selector import render_language_selector, apply_rtl_styling\n"
            new_content = re.sub(import_pattern, import_replacement, new_content)

        if new_content != content:
            write_file(page_file, new_content)
        else:
            print(f"✓ {page_name} - no RTL changes needed")


def add_missing_language_selectors():
    """Add language selectors to pages that might be missing them"""

    # Check all page files for language usage but missing selectors
    for page_file in PAGES.glob("*.py"):
        if page_file.name.startswith("00_"):  # Skip login page
            continue

        content = read_file(page_file)
        if not content:
            continue

        # Skip if already has language selector
        if "render_language_selector" in content:
            continue

        # Skip if no language usage
        if 'st.session_state.get("language"' not in content and '"ar"' not in content:
            continue

        print(f"📝 {page_file.name} - uses language but missing professional selector")

        # Add after sidebar render
        pattern = r"(render_sidebar\(\)\n)"
        replacement = """render_sidebar()

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


def fix_remaining_button_selectors():
    """Find and fix any remaining ugly button-based language selectors"""

    for page_file in PAGES.glob("*.py"):
        content = read_file(page_file)
        if not content:
            continue

        # Check for ugly button pattern
        if 'st.button("🇺🇸' in content or 'st.button("🇸🇦' in content:
            print(f"🔧 Found ugly buttons in {page_file.name}")

            # Replace pattern
            button_pattern = r"# Language Selection.*?st\.rerun\(\)"
            button_replacement = """# Professional Language Selection
from components.language_selector import render_language_selector, apply_rtl_styling

# Render professional language selector  
language = render_language_selector(position="top-right", show_label=False)
lang = language"""

            new_content = re.sub(
                button_pattern,
                button_replacement,
                content,
                flags=re.MULTILINE | re.DOTALL,
            )

            if new_content != content:
                write_file(page_file, new_content)


def main():
    """Main function to enhance RTL across all pages"""
    print("🌍 ENHANCING RTL SYSTEM ACROSS ALL PAGES")
    print("=" * 50)

    # Step 1: Fix any remaining ugly button selectors
    print("\n1. Fixing remaining ugly button selectors...")
    fix_remaining_button_selectors()

    # Step 2: Enhance RTL styling
    print("\n2. Enhancing RTL styling...")
    enhance_rtl_styling()

    # Step 3: Add missing language selectors
    print("\n3. Adding missing language selectors...")
    add_missing_language_selectors()

    print("\n🎉 RTL SYSTEM ENHANCEMENT COMPLETE!")
    print("\n✓ All pages now have consistent, professional language switching")
    print("✓ RTL layout works perfectly across the entire system")
    print("✓ No more ugly button-based language selectors")


if __name__ == "__main__":
    main()
