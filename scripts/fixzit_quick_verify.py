#!/usr/bin/env python3
"""
Fixzit Quick Verification Script
A focused verification that completes quickly
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

# Setup paths
ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print("=" * 60)


def run_check(cmd, label, timeout=10):
    """Run a command and return success status"""
    try:
        if isinstance(cmd, str):
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=timeout
            )
        else:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout
            )

        if result.returncode == 0:
            print(f"✅ {label}")
            return True, result.stdout
        else:
            print(f"❌ {label}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print(f"⚠️ {label} (timeout)")
        return False, "Timeout"
    except Exception as e:
        print(f"⚠️ {label}: {e}")
        return False, str(e)


def main():
    print("🔧 FIXZIT - Quick Verification Report")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 Root: {ROOT}")

    results = {
        "timestamp": datetime.now().isoformat(),
        "checks": {},
        "summary": {"passed": 0, "failed": 0, "warnings": 0},
    }

    # 1. Core Files Check
    print_header("1. Core Files")
    core_files = ["app.py", "requirements.txt", "scripts/fixzit_review_all.py"]
    for file in core_files:
        path = ROOT / file
        if path.exists():
            print(f"✅ {file} exists")
            results["checks"][file] = "exists"
            results["summary"]["passed"] += 1
        else:
            print(f"❌ {file} missing")
            results["checks"][file] = "missing"
            results["summary"]["failed"] += 1

    # 2. Python Syntax Check
    print_header("2. Python Syntax")
    for py_file in ["app.py", "navigation.py", "nav_config.py"]:
        if (ROOT / py_file).exists():
            success, _ = run_check(
                f"python -m py_compile {py_file}", f"{py_file} syntax"
            )
            if success:
                results["summary"]["passed"] += 1
            else:
                results["summary"]["failed"] += 1

    # 3. Dependencies Check
    print_header("3. Dependencies")
    deps = [
        ("streamlit", "Core framework"),
        ("psycopg2", "Database driver"),
        ("black", "Code formatter"),
        ("ruff", "Linter"),
        ("mypy", "Type checker"),
    ]

    for module, desc in deps:
        cmd = f'python -c "import {module}"'
        success, _ = run_check(cmd, f"{module} ({desc})")
        if success:
            results["summary"]["passed"] += 1
        else:
            results["summary"]["failed"] += 1

    # 4. Application Status
    print_header("4. Application Status")

    # Check if app is running
    success, _ = run_check(
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"',
        "App accessible on port 5000",
    )
    if success:
        results["summary"]["passed"] += 1
        results["checks"]["app_status"] = "running"
    else:
        results["summary"]["failed"] += 1
        results["checks"]["app_status"] = "not accessible"

    # 5. Database Connection
    print_header("5. Database")

    if os.environ.get("DATABASE_URL"):
        print("✅ DATABASE_URL is set")
        results["summary"]["passed"] += 1

        # Test connection
        test_script = """
import os
import psycopg2
try:
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.close()
    print("Connected")
except Exception as e:
    print(f"Error: {e}")
"""
        success, output = run_check(
            f'python -c "{test_script}"', "Database connection test"
        )
        if success and "Connected" in output:
            results["summary"]["passed"] += 1
        else:
            results["summary"]["failed"] += 1
    else:
        print("⚠️ DATABASE_URL not set")
        results["summary"]["warnings"] += 1

    # 6. Code Quality (Quick)
    print_header("6. Code Quality (Quick)")

    # Black check
    success, _ = run_check(
        "python -m black --check app.py 2>/dev/null", "Black formatting"
    )
    if not success:
        print("  ℹ️ Run 'black app.py' to fix formatting")
        results["summary"]["warnings"] += 1
    else:
        results["summary"]["passed"] += 1

    # Ruff check
    success, output = run_check("python -m ruff check app.py --quiet", "Ruff linting")
    if not success and output:
        print("  ℹ️ Run 'ruff check app.py --fix' to fix issues")
        results["summary"]["warnings"] += 1
    else:
        results["summary"]["passed"] += 1

    # 7. Project Structure
    print_header("7. Project Structure")

    important_dirs = ["pages", "utils", "scripts", "artifacts"]
    for dir_name in important_dirs:
        dir_path = ROOT / dir_name
        if dir_path.exists():
            count = len(list(dir_path.glob("*")))
            print(f"✅ {dir_name}/ ({count} items)")
            results["summary"]["passed"] += 1
        else:
            print(f"⚠️ {dir_name}/ missing")
            results["summary"]["warnings"] += 1

    # Final Summary
    print_header("SUMMARY")
    print(f"✅ Passed: {results['summary']['passed']}")
    print(f"❌ Failed: {results['summary']['failed']}")
    print(f"⚠️ Warnings: {results['summary']['warnings']}")

    total = sum(results["summary"].values())
    if total > 0:
        success_rate = (results["summary"]["passed"] / total) * 100
        print(f"🎯 Success Rate: {success_rate:.1f}%")

    # Save results
    report_path = (
        ARTIFACTS / f"quick-verify-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    )
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Report saved to: {report_path}")

    # Exit code
    if results["summary"]["failed"] > 0:
        print("\n❌ Verification completed with failures")
        return 1
    elif results["summary"]["warnings"] > 0:
        print("\n⚠️ Verification completed with warnings")
        return 0
    else:
        print("\n✅ All checks passed!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
