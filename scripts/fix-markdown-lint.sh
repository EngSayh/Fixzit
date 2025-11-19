#!/bin/bash

# Fix markdown linting violations in progress reports
# Addresses: MD022 (headings spacing), MD031 (code blocks spacing), MD040 (code language), MD009 (trailing spaces)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Fixing Markdown Linting Violations${NC}"
echo "================================================"

# Find all markdown files in docs/archived/DAILY_PROGRESS_REPORTS
files=$(find docs/archived/DAILY_PROGRESS_REPORTS -name "2025-11-11*.md" 2>/dev/null || true)

if [ -z "$files" ]; then
  echo -e "${YELLOW}⚠️  No markdown files found${NC}"
  exit 0
fi

fixed_count=0

for file in $files; do
  echo -e "\n${YELLOW}📝 Processing: $file${NC}"
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Fix using Python script
  python3 << 'PYTHON_SCRIPT' "$file"
import sys
import re

file_path = sys.argv[1]

with open(file_path, 'r') as f:
    lines = f.readlines()

fixed_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Remove trailing whitespace (MD009)
    line = line.rstrip() + '\n' if line.endswith('\n') else line.rstrip()
    
    # Check if this is a heading
    if re.match(r'^#+\s', line):
        # MD022: Add blank line before heading if missing
        if fixed_lines and fixed_lines[-1].strip() != '':
            fixed_lines.append('\n')
        fixed_lines.append(line)
        # MD022: Add blank line after heading if next line isn't blank
        if i + 1 < len(lines) and lines[i + 1].strip() != '':
            fixed_lines.append('\n')
    
    # Check if this is a code fence start
    elif line.strip().startswith('```'):
        # MD031: Add blank line before code block if missing
        if fixed_lines and fixed_lines[-1].strip() != '':
            fixed_lines.append('\n')
        
        # MD040: Add language specifier if missing
        if line.strip() == '```':
            fixed_lines.append('```bash\n')
        else:
            fixed_lines.append(line)
        
        # Copy all lines until closing fence
        i += 1
        while i < len(lines) and not lines[i].strip().startswith('```'):
            fixed_lines.append(lines[i].rstrip() + '\n')
            i += 1
        
        # Add closing fence
        if i < len(lines):
            fixed_lines.append(lines[i].rstrip() + '\n')
        
        # MD031: Add blank line after code block if next line isn't blank
        if i + 1 < len(lines) and lines[i + 1].strip() != '':
            fixed_lines.append('\n')
    
    # Regular line
    else:
        fixed_lines.append(line)
    
    i += 1

# Write fixed content
with open(file_path, 'w') as f:
    f.writelines(fixed_lines)

print(f"✅ Fixed: {file_path}")

PYTHON_SCRIPT
  
  if [ $? -eq 0 ]; then
    fixed_count=$((fixed_count + 1))
    echo -e "${GREEN}✅ Fixed${NC}"
    rm "$file.bak"
  else
    echo -e "${RED}❌ Failed - restoring backup${NC}"
    mv "$file.bak" "$file"
  fi
done

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Fixed $fixed_count files${NC}"
