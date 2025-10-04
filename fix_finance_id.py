import os
import shutil
import sys

filepath = "app/api/finance/invoices/[id]/route.ts"

try:
    # Verify file exists
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        sys.exit(1)
     
    # Create backup
    backup_path = f"{filepath}.backup"
    shutil.copy2(filepath, backup_path)
     
    with open(filepath, "r") as f:
        content = f.read()
     
    old = 'req.ip ?? ""'
    new = '(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown")'
     
    if old not in content:
        print(f"⚠️  Pattern not found in file: {old}")
        os.remove(backup_path)
        sys.exit(0)
     
    new_content = content.replace(old, new)
    replacement_count = content.count(old)
     
    with open(filepath, "w") as f:
        f.write(new_content)
     
    print(f"✅ Fixed! Replaced {replacement_count} occurrence(s)")
    os.remove(backup_path)  # Clean up backup on success
     
except (IOError, OSError) as e:
    print(f"❌ Error: {e}")
    if 'backup_path' in locals() and os.path.exists(backup_path):
        print(f"Backup available at: {backup_path}")
    sys.exit(1)
