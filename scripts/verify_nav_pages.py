#!/usr/bin/env python3
"""
Verify that all pages configured in nav_config.py actually exist
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nav_config import NAV


def verify_pages():
    """Check all configured pages exist"""
    missing_pages = []
    existing_pages = []

    for group in NAV:
        for item in group["items"]:
            # Check item page
            if "page" in item and item["page"]:
                if os.path.exists(item["page"]):
                    existing_pages.append(item["page"])
                else:
                    missing_pages.append(
                        {
                            "path": item["page"],
                            "label": item["label"],
                            "group": group["group"],
                        }
                    )

            # Check children pages
            if "children" in item and item["children"]:
                for child in item["children"]:
                    if "page" in child and child["page"]:
                        if os.path.exists(child["page"]):
                            existing_pages.append(child["page"])
                        else:
                            missing_pages.append(
                                {
                                    "path": child["page"],
                                    "label": child["label"],
                                    "parent": item["label"],
                                    "group": group["group"],
                                }
                            )

    # Print results
    print("🔍 NAVIGATION PAGE VERIFICATION")
    print("=" * 50)

    print(f"\n✅ Existing pages: {len(existing_pages)}")
    for page in sorted(existing_pages)[:10]:  # Show first 10
        print(f"   • {page}")
    if len(existing_pages) > 10:
        print(f"   ... and {len(existing_pages) - 10} more")

    if missing_pages:
        print(f"\n❌ Missing pages: {len(missing_pages)}")
        for missing in missing_pages:
            parent = missing.get("parent", "")
            if parent:
                print(f"   • {missing['path']}")
                print(f"     ({missing['group']} → {parent} → {missing['label']})")
            else:
                print(f"   • {missing['path']}")
                print(f"     ({missing['group']} → {missing['label']})")
    else:
        print("\n🎉 All configured pages exist!")

    print("\n" + "=" * 50)
    print(f"Total: {len(existing_pages)} existing, {len(missing_pages)} missing")

    return len(missing_pages) == 0


if __name__ == "__main__":
    success = verify_pages()
    sys.exit(0 if success else 1)
