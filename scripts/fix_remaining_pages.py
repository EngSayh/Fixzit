#!/usr/bin/env python3
"""
Fix remaining pages with navigation issues
"""

import os

# Template for pages that use main() function structure
TEMPLATE_WITH_MAIN = """# Add at the beginning of the file after imports
import streamlit as st
from navigation import render_sidebar
from utils.session_init import initialize_session_state

# Page config
st.set_page_config(
    page_title="PAGE_TITLE",
    page_icon="ICON",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
initialize_session_state()

# Check authentication
if not st.session_state.get("authenticated", False):
    st.error("Please login to access this page")
    st.switch_page("pages/00_Login.py")
    st.stop()

# Render Firebase-style navigation sidebar
render_sidebar()

# Call the main function
main()
"""

pages_to_fix = {
    "pages/999_CodeQuality.py": {
        "title": "Code Quality - Fixzit",
        "icon": "🔍",
        "has_main": True,
    },
    "pages/998_FeatureFlags.py": {
        "title": "Feature Flags - Fixzit",
        "icon": "🚩",
        "has_main": True,
    },
    "pages/997_RemoteConfig.py": {
        "title": "Remote Config - Fixzit",
        "icon": "📡",
        "has_main": True,
    },
    "pages/996_ModuleManager.py": {
        "title": "Module Manager - Fixzit",
        "icon": "📦",
        "has_main": True,
    },
    "pages/7_Financials.py": {
        "title": "Financials - Fixzit",
        "icon": "💼",
        "has_main": False,
    },
    "pages/3_Tickets.py": {
        "title": "Tickets - Fixzit",
        "icon": "🎫",
        "has_main": False,
    },
    "pages/4_Contracts.py": {
        "title": "Contracts - Fixzit",
        "icon": "📃",
        "has_main": False,
    },
}


def fix_page(filepath, config):
    """Fix a single page with proper navigation"""

    # Skip redirect pages
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            content = f.read()
            if "st.switch_page" in content and len(content) < 300:
                print(f"  ⬜ {os.path.basename(filepath)} - redirect page, skipped")
                return False

    if config["has_main"]:
        # Page has main() function
        with open(filepath, "r") as f:
            content = f.read()

        # Add imports if missing
        if "from navigation import render_sidebar" not in content:
            # Find the import section
            lines = content.split("\n")
            import_end = 0
            for i, line in enumerate(lines):
                if line.startswith("import ") or line.startswith("from "):
                    import_end = i + 1
                elif import_end > 0 and line and not line.startswith("#"):
                    break

            # Insert navigation import
            lines.insert(import_end, "from navigation import render_sidebar")
            lines.insert(
                import_end + 1,
                "from utils.session_init import initialize_session_state",
            )

            # Add page config and navigation before main() call
            main_index = -1
            for i, line in enumerate(lines):
                if line.strip() == "def main():":
                    # Find where main() is called
                    for j in range(i, len(lines)):
                        if "main()" in lines[j] and "def main" not in lines[j]:
                            main_index = j
                            break
                    break

            if main_index > 0:
                # Insert navigation setup before main() call
                setup_code = f"""
# Page config
st.set_page_config(
    page_title="{config['title']}",
    page_icon="{config['icon']}",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
initialize_session_state()

# Check authentication
if not st.session_state.get("authenticated", False):
    st.error("Please login to access this page")
    st.switch_page("pages/00_Login.py")
    st.stop()

# Render Firebase-style navigation sidebar
render_sidebar()
"""
                lines.insert(main_index, setup_code)

            # Write back
            with open(filepath, "w") as f:
                f.write("\n".join(lines))

            print(f"  ✅ {os.path.basename(filepath)} - fixed with main() structure")
            return True
    else:
        # Regular page without main()
        with open(filepath, "r") as f:
            content = f.read()

        # Add standard navigation if missing
        if "render_sidebar" not in content:
            lines = content.split("\n")

            # Add imports
            if "from navigation import render_sidebar" not in content:
                import_end = 0
                for i, line in enumerate(lines):
                    if line.startswith("import ") or line.startswith("from "):
                        import_end = i + 1

                lines.insert(import_end, "from navigation import render_sidebar")
                lines.insert(
                    import_end + 1,
                    "from utils.session_init import initialize_session_state",
                )

            # Add page setup after imports
            setup_code = f"""
# Page config
st.set_page_config(
    page_title="{config['title']}",
    page_icon="{config['icon']}",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
initialize_session_state()

# Check authentication
if not st.session_state.get("authenticated", False):
    st.error("Please login to access this page")
    st.switch_page("pages/00_Login.py")
    st.stop()

# Render Firebase-style navigation sidebar
render_sidebar()
"""
            # Find where to insert (after imports)
            for i, line in enumerate(lines):
                if (
                    line
                    and not line.startswith("import")
                    and not line.startswith("from")
                    and not line.startswith("#")
                    and not line.strip().startswith('"""')
                ):
                    lines.insert(i, setup_code)
                    break

            with open(filepath, "w") as f:
                f.write("\n".join(lines))

            print(f"  ✅ {os.path.basename(filepath)} - fixed standard page")
            return True

    return False


def main():
    print("🔧 FIXING REMAINING PAGES")
    print("=" * 50)

    fixed = 0
    for filepath, config in pages_to_fix.items():
        if fix_page(filepath, config):
            fixed += 1

    print()
    print(f"📊 Fixed {fixed}/{len(pages_to_fix)} pages")


if __name__ == "__main__":
    main()
