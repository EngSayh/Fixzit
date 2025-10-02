import sys

try:
    filepath = "app/api/ats/convert-to-employee/route.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Remove the duplicate Role import I just added
    new_lines = []
    for line in lines:
        if "import { Role } from '@/lib/models/index';" not in line:
            new_lines.append(line)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    print("✅ Removed duplicate Role import")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
