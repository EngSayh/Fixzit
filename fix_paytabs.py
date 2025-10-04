import sys

try:
    filepath = "app/api/payments/paytabs/callback/route.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Add vatAmount field that is expected by ZATCAData
    old = """      const zatcaQR = await generateZATCAQR({
        sellerName: 'Fixzit Enterprise',
        vatNumber: '300123456789012',
        timestamp: new Date().toISOString(),
        total: String(total)
      });"""
    
    new = """      const zatcaQR = await generateZATCAQR({
        sellerName: 'Fixzit Enterprise',
        vatNumber: '300123456789012',
        timestamp: new Date().toISOString(),
        total: String(total),
        vatAmount: String(+(total * 0.15).toFixed(2))
      });"""
    
    content = content.replace(old, new)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed app/api/payments/paytabs/callback.ts")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
