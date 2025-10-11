#!/usr/bin/env python3
"""
Fix req.ip in finance/invoices/[id]/route.ts
"""

import os

filepath = 'app/api/finance/invoices/[id]/route.ts'

# Check if file exists
if not os.path.exists(filepath):
    print(f"❌ File not found: {filepath}")
    exit(1)

# Read file
with open(filepath, 'r') as f:
    content = f.read()

# Store original for comparison
original = content

# Fix req.ip usage
old_pattern = 'req.ip ?? ""'
new_pattern = 'req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"'

content = content.replace(old_pattern, new_pattern)

# Check if any changes were made
if content == original:
    print(f"⚠️  No changes needed - pattern not found")
    print(f"   Searched for: {old_pattern}")
else:
    # Write back
    with open(filepath, 'w') as f:
        f.write(content)
    
    replacements = original.count(old_pattern)
    print(f"✅ Fixed {replacements} occurrence(s) in {filepath}")
    print(f"   Replaced: {old_pattern}")
    print(f"   With: {new_pattern}")
