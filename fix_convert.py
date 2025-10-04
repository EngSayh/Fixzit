import re
import sys

try:
    filepath = 'app/api/ats/convert-to-employee/route.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    content = re.sub(
        r"""const canConvertApplications = \['admin', 'hr'\]\.includes\(user\.role\) \|\|\s*\n\s*\n""",
        """const canConvertApplications = ['ADMIN', 'HR'].includes(user.role);\n""",
        content
    )
    
    if content == original:
        print('⚠️  Warning: No changes made - pattern not found')
        sys.exit(0)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('✅ Fixed!')
    sys.exit(0)
except FileNotFoundError:
    print(f'❌ Error: File not found - {filepath}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
