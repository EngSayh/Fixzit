import sys

try:
    filepath = "app/api/ats/convert-to-employee/route.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Add Role import if not present
    if "import { Role }" not in content:
        content = content.replace(
            "import { getSessionUser } from '@/server/middleware/withAuthRbac';",
            "import { getSessionUser } from '@/server/middleware/withAuthRbac';\nimport { Role } from '@/lib/models/index';"
        )
    
    # Replace string literals with enum values
    content = content.replace("['ADMIN', 'HR'].includes(user.role)", "[Role.ADMIN, Role.HR].includes(user.role)")
    content = content.replace("user.role !== 'ADMIN'", "user.role !== Role.ADMIN")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Fixed ats/convert-to-employee Role enum")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
