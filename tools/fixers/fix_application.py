import sys

try:
    filepath = "server/models/Application.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix the history initialization with type cast
    old = "      this.history = [{ action: 'applied', by: 'candidate', at: new Date() }];"
    new = "      this.history = [{ action: 'applied', by: 'candidate', at: new Date(), details: undefined }] as any;"
    
    content = content.replace(old, new)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed server/models/Application.ts")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
