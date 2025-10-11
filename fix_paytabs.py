import sys
import os

try:
    filepath = "app/api/payments/paytabs/callback/route.ts"
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        sys.exit(1)
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Store original content to verify replacement
    original_content = content
    
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
    
    # Verify the replacement was successful
    if content == original_content:
        print(f"⚠️  Pattern not found in {filepath}")
        sys.exit(0)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed app/api/payments/paytabs/callback.ts")
    sys.exit(0)
    
except FileNotFoundError as e:
    print(f"❌ File not found: {e}")
    sys.exit(1)
except (IOError, OSError) as e:
    print(f"❌ I/O error: {e}")
    sys.exit(1)
except UnicodeDecodeError as e:
    print(f"❌ Encoding error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
