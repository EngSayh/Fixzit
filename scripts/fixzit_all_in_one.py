# scripts/fixzit_all_in_one.py
"""
Fixzit - Comprehensive Verification & Optimization System
=========================================================
Implements complete system verification, optimization, and maintenance.
"""

from __future__ import annotations
import os
import sys
import json
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple, Set

# ---------------------------- Paths ----------------------------
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
SHOT = ART / "screenshots"
BACKUPS = ART / "backups"
PAGES = ROOT / "pages"
MODULES = ROOT / "modules"

# Create directories
ART.mkdir(exist_ok=True)
SHOT.mkdir(exist_ok=True)
BACKUPS.mkdir(exist_ok=True)

# ---------------------------- Utils ----------------------------
def _print(s: str): 
    sys.stdout.write(s + "\n")
    sys.stdout.flush()

def _w(p: Path, t: str): 
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(t, encoding="utf-8")

def timestamp() -> str:
    import datetime
    return datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

def run(cmd: List[str] | str, label: str, autofix=False) -> Tuple[int, str]:
    _print(f"\n=== {label} ===")
    if isinstance(cmd, str):
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    else:
        proc = subprocess.run(cmd, capture_output=True, text=True)
    
    out = (proc.stdout or "") + (proc.stderr or "")
    
    if proc.returncode == 0:
        _print(f"[OK] {label}")
    else:
        _print(f"[FAIL] {label} (rc={proc.returncode})")
        if autofix:
            try:
                if "ruff" in str(cmd):
                    subprocess.run([sys.executable, "-m", "ruff", "check", ".", "--fix"])
                if "black" in str(cmd):
                    subprocess.run([sys.executable, "-m", "black", "."])
            except Exception:
                pass
    
    return proc.returncode, out

# ---------------------------- Main Verifications ----------------------------
def verify_navigation():
    """Verify navigation system is working correctly"""
    _print("\n=== Verifying Navigation System ===")
    issues = []
    
    # Check navigation_new.py exists
    nav_file = ROOT / "navigation_new.py"
    if not nav_file.exists():
        issues.append("navigation_new.py is missing")
        return issues
    
    # Check for proper imports
    content = nav_file.read_text(encoding="utf-8")
    required_imports = ["streamlit", "typing", "base64"]
    for imp in required_imports:
        if f"import {imp}" not in content:
            issues.append(f"Missing import: {imp}")
    
    # Check NAV structure is properly defined
    if "NAV: List[Dict]" not in content:
        issues.append("NAV structure not properly typed")
    
    # Check for all navigation groups
    required_groups = ["Dashboard", "Work Management", "Properties", "Finance", 
                      "Marketplace", "Users & Teams", "Administration", 
                      "Communications", "Security & Sharing", "System Tools"]
    for group in required_groups:
        if f'group": "{group}"' not in content:
            issues.append(f"Missing navigation group: {group}")
    
    return issues

def verify_modules():
    """Verify all modules exist and are properly structured"""
    _print("\n=== Verifying Modules ===")
    issues = []
    
    # Check modules directory exists
    if not MODULES.exists():
        issues.append("modules/ directory is missing")
        return issues
    
    # Get list of module files
    module_files = list(MODULES.glob("*.py"))
    if len(module_files) < 60:
        issues.append(f"Expected 60+ modules, found only {len(module_files)}")
    
    # Check critical modules exist
    critical_modules = [
        "01_Dashboard_WorkOS.py",
        "00_Login.py",
        "03_Tickets_WorkOS.py",
        "05_Properties_WorkOS.py",
        "09_Payments_WorkOS.py",
        "23_User_Management_WorkOS.py",
        "31_Admin_Panel.py"
    ]
    
    for module in critical_modules:
        module_path = MODULES / module
        if not module_path.exists():
            issues.append(f"Critical module missing: {module}")
        else:
            # Check module has basic Streamlit structure
            content = module_path.read_text(encoding="utf-8")
            if "import streamlit as st" not in content:
                issues.append(f"Module {module} missing Streamlit import")
    
    return issues

def verify_database():
    """Verify database connectivity and structure"""
    _print("\n=== Verifying Database ===")
    issues = []
    
    try:
        import psycopg2
        
        # Check DATABASE_URL is set
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            issues.append("DATABASE_URL environment variable not set")
            return issues
        
        # Try to connect
        try:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            
            # Check critical tables exist
            critical_tables = ["users", "properties", "contracts", "tickets", "payments"]
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            existing_tables = [row[0] for row in cur.fetchall()]
            
            for table in critical_tables:
                if table not in existing_tables:
                    issues.append(f"Critical table missing: {table}")
            
            conn.close()
        except Exception as e:
            issues.append(f"Database connection failed: {str(e)}")
    
    except ImportError:
        issues.append("psycopg2 not installed")
    
    return issues

def verify_streamlit_config():
    """Verify Streamlit configuration"""
    _print("\n=== Verifying Streamlit Config ===")
    issues = []
    
    # Check .streamlit/config.toml exists
    config_path = ROOT / ".streamlit" / "config.toml"
    if not config_path.exists():
        issues.append(".streamlit/config.toml is missing")
        return issues
    
    # Check required settings
    content = config_path.read_text(encoding="utf-8")
    required_settings = [
        'port = 5000',
        'address = "0.0.0.0"',
        'headless = true'
    ]
    
    for setting in required_settings:
        if setting not in content:
            issues.append(f"Missing config setting: {setting}")
    
    return issues

def verify_app_structure():
    """Verify main app.py structure"""
    _print("\n=== Verifying App Structure ===")
    issues = []
    
    # Check app.py exists
    app_file = ROOT / "app.py"
    if not app_file.exists():
        issues.append("app.py is missing")
        return issues
    
    content = app_file.read_text(encoding="utf-8")
    
    # Check required imports and setup
    required_elements = [
        "import streamlit as st",
        "from navigation_new import render_sidebar",
        "st.set_page_config",
        "render_sidebar("
    ]
    
    for element in required_elements:
        if element not in content:
            issues.append(f"app.py missing: {element}")
    
    return issues

def fix_issues(all_issues: Dict[str, List[str]]):
    """Attempt to fix identified issues"""
    _print("\n=== Attempting Auto-Fixes ===")
    fixes_applied = []
    
    # Fix Streamlit config if missing
    if "Streamlit Config" in all_issues:
        config_path = ROOT / ".streamlit" / "config.toml"
        config_path.parent.mkdir(exist_ok=True)
        config_content = """[server]
headless = true
address = "0.0.0.0"
port = 5000

[theme]
primaryColor = "#F6851F"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
"""
        config_path.write_text(config_content, encoding="utf-8")
        fixes_applied.append("Created .streamlit/config.toml")
    
    return fixes_applied

def generate_report(all_issues: Dict[str, List[str]], fixes: List[str]):
    """Generate verification report"""
    report = ["# Fixzit System Verification Report", ""]
    report.append(f"Generated: {timestamp()}")
    report.append("")
    
    # Summary
    total_issues = sum(len(issues) for issues in all_issues.values())
    report.append(f"## Summary")
    report.append(f"- Total Issues Found: {total_issues}")
    report.append(f"- Auto-fixes Applied: {len(fixes)}")
    report.append("")
    
    # Issues by category
    report.append("## Issues by Category")
    for category, issues in all_issues.items():
        if issues:
            report.append(f"\n### {category}")
            for issue in issues:
                report.append(f"- ❌ {issue}")
        else:
            report.append(f"\n### {category}")
            report.append("- ✅ All checks passed")
    
    # Fixes applied
    if fixes:
        report.append("\n## Auto-fixes Applied")
        for fix in fixes:
            report.append(f"- ✅ {fix}")
    
    # Save report
    report_path = ART / "verification_report.md"
    report_path.write_text("\n".join(report), encoding="utf-8")
    _print(f"\nReport saved to: {report_path}")
    
    return "\n".join(report)

def main():
    """Main verification runner"""
    _print("=" * 60)
    _print("Fixzit System Verification & Optimization")
    _print("=" * 60)
    
    # Run all verifications
    all_issues = {
        "Navigation": verify_navigation(),
        "Modules": verify_modules(),
        "Database": verify_database(),
        "Streamlit Config": verify_streamlit_config(),
        "App Structure": verify_app_structure()
    }
    
    # Attempt fixes
    fixes = fix_issues(all_issues)
    
    # Generate report
    report = generate_report(all_issues, fixes)
    
    # Print summary
    total_issues = sum(len(issues) for issues in all_issues.values())
    _print("\n" + "=" * 60)
    if total_issues == 0:
        _print("✅ ALL VERIFICATIONS PASSED!")
    else:
        _print(f"⚠️ {total_issues} issues found - see artifacts/verification_report.md")
    _print("=" * 60)
    
    return 0 if total_issues == 0 else 1

if __name__ == "__main__":
    sys.exit(main())