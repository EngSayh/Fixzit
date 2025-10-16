import sys

try:
    filepath = "server/finance/invoice.service.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix to handle array result
    old = "  const match = latest?.number?.match(/INV-(\\d+)/);"
    new = "  const latestNumber = Array.isArray(latest) ? latest[0]?.number : latest?.number;\n  const match = latestNumber?.match(/INV-(\\d+)/);"
    
    content = content.replace(old, new)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed server/finance/invoice.service.ts")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
