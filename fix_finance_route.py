import sys

try:
    filepath = "app/api/finance/invoices/[id]/route.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    old_pattern = 'req.ip ?? ""'
    new_pattern = '(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown")'
    
    content = content.replace(old_pattern, new_pattern)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed finance/invoices/[id]/route.ts")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
