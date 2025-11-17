#!/usr/bin/env python3
"""
Quick Progress Audit for Fixzit Implementation
==============================================

Audits the current state against user requirements:
1. RTL layout when Arabic is selected
2. Navigation with Arabic translations
3. Fixzit logo in sidebar
4. Single-expand sidebar behavior
5. Page navigation working
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "pages"


def check_file_exists(path, description):
    """Check if file exists and return status"""
    full_path = ROOT / path if not isinstance(path, Path) else path
    exists = full_path.exists()
    status = "✓ PASS" if exists else "✗ FAIL"
    print(f"{status:<8} {description}")
    if exists and full_path.is_file():
        size = full_path.stat().st_size
        print(f"         File size: {size} bytes")
    return exists


def check_file_contains(path, content, description):
    """Check if file contains specific content"""
    full_path = ROOT / path if not isinstance(path, Path) else path
    if not full_path.exists():
        print(f"✗ FAIL   {description} (file not found)")
        return False

    try:
        file_content = full_path.read_text(encoding="utf-8")
        if isinstance(content, str):
            found = content in file_content
        elif isinstance(content, list):
            found = all(c in file_content for c in content)
        else:
            found = False

        status = "✓ PASS" if found else "✗ FAIL"
        print(f"{status:<8} {description}")
        return found
    except Exception as e:
        print(f"✗ ERROR  {description} ({e})")
        return False


def audit_rtl_implementation():
    """Audit RTL layout implementation"""
    print("\n🌐 RTL (Right-to-Left) Layout Implementation")
    print("=" * 60)

    checks = []

    # Navigation RTL support
    checks.append(
        check_file_contains(
            "navigation.py",
            'is_rtl = st.session_state.get("language", "en") == "ar"',
            "Navigation has RTL language detection",
        )
    )

    checks.append(
        check_file_contains(
            "navigation.py",
            ["direction: rtl", "right: 0 !important"],
            "Navigation includes RTL CSS positioning",
        )
    )

    # i18n service
    checks.append(
        check_file_contains(
            "services/i18n_service.py",
            ['"ar":', "Arabic", "العربية"],
            "Arabic translations in i18n service",
        )
    )

    # Pages with RTL support
    for page in ["01_Dashboard_WorkOS.py", "05_Properties_WorkOS.py"]:
        checks.append(
            check_file_contains(
                f"pages/{page}",
                'lang = st.session_state.get("language", "en")',
                f"{page} has language detection",
            )
        )

    passed = sum(checks)
    print(f"\nRTL Implementation: {passed}/{len(checks)} checks passed")
    return passed >= len(checks) * 0.8


def audit_navigation_system():
    """Audit navigation system"""
    print("\n🧭 Navigation System")
    print("=" * 60)

    checks = []

    # Core navigation files
    checks.append(check_file_exists("navigation.py", "Navigation module exists"))
    checks.append(check_file_exists("nav_config.py", "Navigation configuration exists"))

    # Navigation features
    checks.append(
        check_file_contains(
            "navigation.py",
            "st.switch_page",
            "Navigation uses st.switch_page for routing",
        )
    )

    checks.append(
        check_file_contains(
            "navigation.py",
            "expanded_groups.clear()",
            "Single-expand navigation behavior implemented",
        )
    )

    # Translations
    checks.append(
        check_file_contains(
            "navigation.py",
            ["group_translations", "item_translations"],
            "Navigation includes Arabic translations",
        )
    )

    # Brand colors
    checks.append(
        check_file_contains(
            "nav_config.py",
            ['"orange": "#F6851F"', '"navy": "#023047"'],
            "Official Fixzit brand colors configured",
        )
    )

    passed = sum(checks)
    print(f"\nNavigation System: {passed}/{len(checks)} checks passed")
    return passed >= len(checks) * 0.8


def audit_logo_implementation():
    """Audit logo implementation in sidebar"""
    print("\n🖼️ Logo Implementation")
    print("=" * 60)

    checks = []

    # Check for logo loading in navigation
    checks.append(
        check_file_contains(
            "navigation.py",
            ["logo_path", "base64", "fixzit_logo"],
            "Logo loading code present in navigation",
        )
    )

    # Check for logo assets
    logo_assets = [
        "public/img/fixzit-logo.png",
        "assets/logo.svg",
        "assets/logos/fixzit_official_logo.jpg",
    ]
    logo_found = any(
        check_file_exists(path, f"Logo asset: {path}") for path in logo_assets
    )
    checks.append(logo_found)

    passed = sum(checks)
    print(f"\nLogo Implementation: {passed}/{len(checks)} checks passed")
    return passed >= len(checks) * 0.8


def audit_page_structure():
    """Audit page structure and files"""
    print("\n📄 Page Structure")
    print("=" * 60)

    checks = []

    # Core files
    core_files = [
        ("app.py", "Main application entry point"),
        ("navigation.py", "Navigation system"),
        ("services/i18n_service.py", "Internationalization service"),
    ]

    for path, desc in core_files:
        checks.append(check_file_exists(path, desc))

    # Key pages
    key_pages = [
        "00_Login.py",
        "01_Dashboard_WorkOS.py",
        "05_Properties_WorkOS.py",
        "06_Contracts_WorkOS.py",
        "08_Payments_WorkOS.py",
    ]

    for page in key_pages:
        checks.append(check_file_exists(f"pages/{page}", f"Page: {page}"))

    # Count total pages
    if PAGES.exists():
        page_count = len(list(PAGES.glob("*.py")))
        print(f"✓ INFO   Total pages found: {page_count}")

    passed = sum(checks)
    print(f"\nPage Structure: {passed}/{len(checks)} checks passed")
    return passed >= len(checks) * 0.8


def audit_translations():
    """Audit translation completeness"""
    print("\n🌍 Translation System")
    print("=" * 60)

    checks = []

    # i18n service structure
    checks.append(
        check_file_contains(
            "services/i18n_service.py",
            ["class I18nService", "def t(", "rtl_languages"],
            "i18n service class structure complete",
        )
    )

    # Key translations present
    key_translations = [
        "dashboard",
        "properties",
        "contracts",
        "payments",
        "users",
        "settings",
        "tickets",
        "login",
    ]

    for key in key_translations:
        checks.append(
            check_file_contains(
                "services/i18n_service.py",
                f'"{key}":',
                f"Translation key '{key}' present",
            )
        )

    passed = sum(checks)
    print(f"\nTranslation System: {passed}/{len(checks)} checks passed")
    return passed >= len(checks) * 0.8


def main():
    """Run comprehensive audit"""
    print("🔧 FIXZIT IMPLEMENTATION PROGRESS AUDIT")
    print("=" * 60)
    print(f"Root directory: {ROOT}")
    print(f"Pages directory: {PAGES}")

    # Run all audits
    results = []

    results.append(("RTL Layout", audit_rtl_implementation()))
    results.append(("Navigation System", audit_navigation_system()))
    results.append(("Logo Implementation", audit_logo_implementation()))
    results.append(("Page Structure", audit_page_structure()))
    results.append(("Translation System", audit_translations()))

    # Summary
    print("\n" + "=" * 60)
    print("📊 AUDIT SUMMARY")
    print("=" * 60)

    passed = 0
    for category, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:<8} {category}")
        if result:
            passed += 1

    total = len(results)
    percentage = (passed / total) * 100

    print(f"\nOVERALL RESULT: {passed}/{total} categories passed ({percentage:.1f}%)")

    if passed == total:
        print("🎉 ALL IMPLEMENTATIONS VERIFIED!")
        return 0
    else:
        print(f"⚠️  {total-passed} categories need attention")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[CANCELLED] Audit interrupted")
        sys.exit(130)
    except Exception as e:
        print(f"\n[ERROR] Audit failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
