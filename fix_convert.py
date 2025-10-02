import re
with open('app/api/ats/convert-to-employee/route.ts', 'r') as f:
    content = f.read()
content = re.sub(
    r\"\"\"const canConvertApplications = \['admin', 'hr'\]\.includes\(user\.role\) \|\|\s*\n\s*\n\"\"\",
    \"\"\"const canConvertApplications = ['ADMIN', 'HR'].includes(user.role);\n\"\"\",
    content
)
with open('app/api/ats/convert-to-employee/route.ts', 'w') as f:
    f.write(content)
print('Fixed!')
