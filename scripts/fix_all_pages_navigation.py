#!/usr/bin/env python3
"""
Fix navigation and UI elements across all pages
"""

import os
import re


def should_have_navigation(filepath):
    """Check if a page should have navigation (exclude login/signup pages)"""
    exclude_patterns = [
        "Login",
        "SignUp",
        "Register",
        "Reset_Password",
        "PasswordlessLogin",
        "AuthCallback",
    ]
    filename = os.path.basename(filepath)
    return not any(pattern in filename for pattern in exclude_patterns)


def fix_page_navigation(filepath):
    """Fix navigation and required elements in a page"""
    with open(filepath, "r") as f:
        content = f.read()

    filename = os.path.basename(filepath)
    original_content = content
    modified = False

    # Skip if already has proper navigation
    if "render_sidebar" in content:
        print(f"  ✓ {filename} - already has navigation")
        return False

    # Replace boot_nav_auto with render_sidebar
    if "boot_nav_auto" in content:
        # Fix import
        content = re.sub(
            r"from ui\.nav import boot_nav_auto",
            "from navigation import render_sidebar",
            content,
        )
        # Fix function call
        content = re.sub(
            r"# Universal bootstrap.*\nboot_nav_auto\(\)",
            "# Render Firebase-style navigation sidebar\nrender_sidebar()",
            content,
        )
        content = re.sub(r"boot_nav_auto\(\)", "render_sidebar()", content)
        modified = True
    elif should_have_navigation(filepath):
        # Add navigation if missing
        # Find where to add the import
        import_pattern = r"(import streamlit as st\n)"
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r"\1from navigation import render_sidebar\n",
                content,
                count=1,
            )

        # Add render_sidebar after authentication check or after page config
        if "st.set_page_config" in content:
            # Find the right place to add navigation
            auth_check_pattern = r'(if not st\.session_state\.get\("authenticated".*?\n.*?st\.stop\(\)\n)'
            if re.search(auth_check_pattern, content, re.DOTALL):
                # Add after authentication check
                content = re.sub(
                    auth_check_pattern,
                    r"\1\n# Render Firebase-style navigation sidebar\nrender_sidebar()\n",
                    content,
                    count=1,
                    flags=re.DOTALL,
                )
                modified = True
            else:
                # Add after page config
                config_pattern = r"(st\.set_page_config\([^)]+\)\n)"
                if re.search(config_pattern, content, re.DOTALL):
                    content = re.sub(
                        config_pattern,
                        r"\1\n# Render Firebase-style navigation sidebar\nrender_sidebar()\n",
                        content,
                        count=1,
                        flags=re.DOTALL,
                    )
                    modified = True

    # Add session initialization if missing
    if "initialize_session_state" not in content and should_have_navigation(filepath):
        # Add import
        if "from utils.session_init import initialize_session_state" not in content:
            import_pattern = r"(import streamlit as st\n)"
            if re.search(import_pattern, content):
                content = re.sub(
                    import_pattern,
                    r"\1from utils.session_init import initialize_session_state\n",
                    content,
                    count=1,
                )

        # Add initialization call after imports but before authentication
        if "st.set_page_config" in content:
            config_pattern = r"(st\.set_page_config\([^)]+\)\n)"
            content = re.sub(
                config_pattern,
                r"\1\n# Initialize session state\ninitialize_session_state()\n",
                content,
                count=1,
                flags=re.DOTALL,
            )
            modified = True

    # Save if modified
    if modified and content != original_content:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"  ✅ {filename} - fixed navigation")
        return True
    elif should_have_navigation(filepath):
        print(f"  ⚠️  {filename} - needs manual fix")
        return False
    else:
        print(f"  ⬜ {filename} - skipped (login/auth page)")
        return False


def main():
    print("🔧 FIXING NAVIGATION ACROSS ALL PAGES")
    print("=" * 50)

    fixed_count = 0
    total_count = 0

    for root, dirs, files in os.walk("pages"):
        for file in files:
            if file.endswith(".py"):
                total_count += 1
                filepath = os.path.join(root, file)
                if fix_page_navigation(filepath):
                    fixed_count += 1

    print()
    print("=" * 50)
    print(f"📊 Results: Fixed {fixed_count}/{total_count} pages")
    print("✅ Navigation fix complete!")


if __name__ == "__main__":
    main()
