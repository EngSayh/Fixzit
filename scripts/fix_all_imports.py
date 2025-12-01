#!/usr/bin/env python3
"""
Fixzit Import Helper

This wrapper replaces the missing legacy script name and delegates to the
current import verification tool under scripts/testing/verify-imports.py.

Usage:
  python scripts/fix_all_imports.py

Note:
  This script is intentionally non-destructive; it runs the existing analyzer
  (analyze-imports.js via verify-imports.py) and reports issues. Fixes should be
  applied manually or via existing codemods if available.
"""

import subprocess
import sys
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VERIFY_SCRIPT = ROOT / "scripts" / "testing" / "verify-imports.py"


def main() -> int:
    if not VERIFY_SCRIPT.exists():
        print("❌ verify-imports.py not found; please ensure scripts/testing/verify-imports.py exists.")
        return 1

    try:
        result = subprocess.run(
            [sys.executable, str(VERIFY_SCRIPT)],
            cwd=ROOT,
            check=False,
        )
        return result.returncode
    except FileNotFoundError:
        print("❌ Python interpreter not found.")
        return 1
    except Exception as exc:  # pylint: disable=broad-except
        print(f"❌ Error running verify-imports.py: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
