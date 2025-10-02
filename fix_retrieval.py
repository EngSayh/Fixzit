import sys

try:
    filepath = "server/copilot/retrieval.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix source to be string | undefined instead of allowing null
    content = content.replace(
        "source: doc.source,",
        "source: doc.source || undefined,"
    )
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed server/copilot/retrieval.ts")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
