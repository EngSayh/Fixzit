#!/usr/bin/env python3
"""Fix duplicate logger imports across the codebase."""

import re
from pathlib import Path

FILES_WITH_DUPLICATES = [
    "app/api/billing/subscribe/route.ts",
    "app/api/copilot/chat/route.ts",
    "app/api/health/database/route.ts",
    "app/api/invoices/[id]/route.ts",
    "app/api/marketplace/products/[slug]/route.ts",
    "app/api/projects/[id]/route.ts",
    "app/api/qa/alert/route.ts",
    "app/api/qa/health/route.ts",
    "app/api/qa/log/route.ts",
    "app/api/work-orders/import/route.ts",
]

LOGGER_IMPORT_PATTERN = re.compile(r"^import \{ logger \} from ['\"]@/lib/logger['\"];?\s*$", re.MULTILINE)

def fix_file(filepath: Path) -> bool:
    """Remove duplicate logger imports, keeping only the first one."""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return False
    
    content = filepath.read_text()
    lines = content.split('\n')
    
    # Track if we've seen the logger import
    found_logger = False
    fixed_lines = []
    
    for line in lines:
        # Check if this line is a logger import
        if LOGGER_IMPORT_PATTERN.match(line):
            if not found_logger:
                # Keep the first occurrence
                fixed_lines.append(line)
                found_logger = True
            # Skip subsequent occurrences
        else:
            fixed_lines.append(line)
    
    # Write back
    filepath.write_text('\n'.join(fixed_lines))
    return True

def main():
    print("🔍 Finding all files with duplicate logger imports...")
    
    base_path = Path("/workspaces/Fixzit")
    fixed_count = 0
    
    for file_path in FILES_WITH_DUPLICATES:
        full_path = base_path / file_path
        print(f"📝 Fixing: {file_path}")
        
        if fix_file(full_path):
            fixed_count += 1
            print(f"✅ Fixed: {file_path}")
    
    print(f"\n✨ Fixed {fixed_count} files with duplicate logger imports")
    print("✅ Duplicate logger import fix complete!")

if __name__ == "__main__":
    main()
