import os
import sys

try:
    filepath = "app/api/finance/invoices/[id]/route.ts"
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        sys.exit(1)
     
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
     
    old_pattern = 'req.ip ?? ""'
    new_pattern = '(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown")'
     
    updated_content = content.replace(old_pattern, new_pattern)
     
    if updated_content == content:
        print(f"⚠️  Pattern not found in {filepath}")
        sys.exit(0)
     
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(updated_content)
     
    print("✅ Fixed finance/invoices/[id]/route.ts")
    sys.exit(0)
    
except FileNotFoundError as e:
    print(f"❌ File not found: {e}")
    sys.exit(1)
except PermissionError as e:
    print(f"❌ Permission denied: {e}")
    sys.exit(1)
except UnicodeDecodeError as e:
    print(f"❌ Encoding error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
