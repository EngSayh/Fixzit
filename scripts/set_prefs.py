#!/usr/bin/env python3
"""
Fixzit Preferences CLI
Easily set preferences for space saver and verification system
"""

import os
import sys
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent.resolve()
PREFS_PATH = ROOT / "config" / "fixzit_prefs.json"

DEFAULT_PREFS = {
    # UI & verification
    "FIXZIT_SKIP_UI": "0",
    # Space saver defaults
    "SLIM_KEEP_BACKUPS": 2,
    "SLIM_ARTIFACTS_DAYS": 3,
    "SLIM_PURGE_PLAYWRIGHT": 0,
    "SLIM_PURGE_PIP": 1,
    "SLIM_PRUNE_SCREENSHOTS": 1,
    # DB behavior
    "AUTO_FIX_DB_RELATIONSHIPS": 1,
    "SEED_ONLY_WHEN_EMPTY": 1,
    "DEMO_MODE": 0
}

def load_prefs():
    """Load current preferences"""
    try:
        if PREFS_PATH.exists():
            data = json.loads(PREFS_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                prefs = DEFAULT_PREFS.copy()
                prefs.update(data)
                return prefs
    except Exception:
        pass
    return DEFAULT_PREFS.copy()

def save_prefs(prefs):
    """Save preferences to file"""
    PREFS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PREFS_PATH.write_text(json.dumps(prefs, indent=2), encoding="utf-8")

def show_current_prefs():
    """Display current preferences"""
    prefs = load_prefs()
    print("Current Fixzit Preferences:")
    print("=" * 40)
    for key, value in prefs.items():
        print(f"{key:25} = {value}")
    print(f"\nStored in: {PREFS_PATH}")

def main():
    parser = argparse.ArgumentParser(description="Manage Fixzit preferences")
    parser.add_argument("--show", action="store_true", help="Show current preferences")
    parser.add_argument("--skip-ui", type=int, choices=[0, 1], help="Skip UI tests (0/1)")
    parser.add_argument("--keep-backups", type=int, help="Number of backups to keep")
    parser.add_argument("--artifacts-days", type=int, help="Days to keep artifacts")
    parser.add_argument("--purge-playwright", type=int, choices=[0, 1], help="Remove Playwright browsers (0/1)")
    parser.add_argument("--purge-pip", type=int, choices=[0, 1], help="Purge pip cache (0/1)")
    parser.add_argument("--prune-screenshots", type=int, choices=[0, 1], help="Remove screenshots (0/1)")
    parser.add_argument("--auto-fix-db", type=int, choices=[0, 1], help="Auto-fix database relationships (0/1)")
    parser.add_argument("--seed-empty-only", type=int, choices=[0, 1], help="Seed only empty tables (0/1)")
    parser.add_argument("--demo-mode", type=int, choices=[0, 1], help="Enable demo mode (0/1)")
    parser.add_argument("--reset", action="store_true", help="Reset to defaults")
    
    # Preset profiles
    parser.add_argument("--zero-risk", action="store_true", help="Apply zero-risk cleanup profile")
    parser.add_argument("--max-savings", action="store_true", help="Apply maximum savings profile")
    
    args = parser.parse_args()
    
    if args.show:
        show_current_prefs()
        return
    
    # Load current preferences
    prefs = load_prefs()
    
    # Apply preset profiles
    if args.zero_risk:
        prefs.update({
            "FIXZIT_SKIP_UI": "0",
            "SLIM_KEEP_BACKUPS": 2,
            "SLIM_ARTIFACTS_DAYS": 3,
            "SLIM_PURGE_PLAYWRIGHT": 0,
            "SLIM_PURGE_PIP": 1,
            "SLIM_PRUNE_SCREENSHOTS": 1,
        })
        print("Applied zero-risk cleanup profile")
    
    if args.max_savings:
        prefs.update({
            "FIXZIT_SKIP_UI": "1",
            "SLIM_KEEP_BACKUPS": 1,
            "SLIM_ARTIFACTS_DAYS": 2,
            "SLIM_PURGE_PLAYWRIGHT": 1,
            "SLIM_PURGE_PIP": 1,
            "SLIM_PRUNE_SCREENSHOTS": 1,
        })
        print("Applied maximum savings profile")
    
    if args.reset:
        prefs = DEFAULT_PREFS.copy()
        print("Reset preferences to defaults")
    
    # Apply individual settings
    if args.skip_ui is not None:
        prefs["FIXZIT_SKIP_UI"] = str(args.skip_ui)
    if args.keep_backups is not None:
        prefs["SLIM_KEEP_BACKUPS"] = args.keep_backups
    if args.artifacts_days is not None:
        prefs["SLIM_ARTIFACTS_DAYS"] = args.artifacts_days
    if args.purge_playwright is not None:
        prefs["SLIM_PURGE_PLAYWRIGHT"] = args.purge_playwright
    if args.purge_pip is not None:
        prefs["SLIM_PURGE_PIP"] = args.purge_pip
    if args.prune_screenshots is not None:
        prefs["SLIM_PRUNE_SCREENSHOTS"] = args.prune_screenshots
    if args.auto_fix_db is not None:
        prefs["AUTO_FIX_DB_RELATIONSHIPS"] = args.auto_fix_db
    if args.seed_empty_only is not None:
        prefs["SEED_ONLY_WHEN_EMPTY"] = args.seed_empty_only
    if args.demo_mode is not None:
        prefs["DEMO_MODE"] = args.demo_mode
    
    # Save preferences
    save_prefs(prefs)
    print(f"Preferences saved to {PREFS_PATH}")
    
    # Show updated preferences
    if not args.show:
        print("\nUpdated preferences:")
        show_current_prefs()

if __name__ == "__main__":
    main()