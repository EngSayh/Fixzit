#!/usr/bin/env python3
"""
Comprehensive Markdown Linting Fixer for Fixzit
Fixes MD022, MD031, MD040, MD009 violations in progress reports
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def fix_markdown_violations(content: str) -> Tuple[str, int]:
    """
    Fix common markdown linting violations.
    
    Returns:
        Tuple of (fixed_content, violations_fixed)
    """
    lines = content.split('\n')
    fixed_lines = []
    violations_fixed = 0
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Remove trailing whitespace (MD009)
        if line.rstrip() != line:
            line = line.rstrip()
            violations_fixed += 1
        
        # Check if this is a heading
        is_heading = re.match(r'^#+\s', line)
        
        # Check if this is a code fence
        is_code_fence_start = line.strip().startswith('```')
        
        # MD022: Headings should be surrounded by blank lines
        if is_heading:
            # Check if previous line exists and is not blank
            if fixed_lines and fixed_lines[-1].strip() != '':
                fixed_lines.append('')
                violations_fixed += 1
            
            fixed_lines.append(line)
            
            # Check if next line exists and is not blank
            if i + 1 < len(lines) and lines[i + 1].strip() != '':
                # Don't add blank line if next line is also a heading or code fence
                next_is_heading = re.match(r'^#+\s', lines[i + 1])
                next_is_fence = lines[i + 1].strip().startswith('```')
                if not (next_is_heading or next_is_fence):
                    fixed_lines.append('')
                    violations_fixed += 1
        
        # MD031 & MD040: Code fences should be surrounded by blank lines and have language
        elif is_code_fence_start:
            # Check if previous line is not blank
            if fixed_lines and fixed_lines[-1].strip() != '':
                fixed_lines.append('')
                violations_fixed += 1
            
            # MD040: Add language specifier if missing
            if line.strip() == '```':
                # Look ahead to determine likely language
                language = 'bash'  # Default
                if i + 1 < len(lines):
                    next_content = lines[i + 1].lower()
                    if 'commit' in next_content or 'author:' in next_content:
                        language = 'plaintext'
                    elif any(kw in next_content for kw in ['extension host', 'tsserver', 'next-server', 'memory']):
                        language = 'plaintext'
                    elif 'npm' in next_content or 'pnpm' in next_content or 'yarn' in next_content:
                        language = 'bash'
                    elif 'const' in next_content or 'function' in next_content or '=>' in next_content:
                        language = 'typescript'
                    elif 'import' in next_content or 'export' in next_content:
                        language = 'typescript'
                
                line = f'```{language}'
                violations_fixed += 1
            
            fixed_lines.append(line)
            
            # Find the closing fence
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith('```'):
                fixed_lines.append(lines[j])
                j += 1
            
            if j < len(lines):
                fixed_lines.append(lines[j])  # Add closing fence
                
                # Check if next line after closing fence is not blank
                if j + 1 < len(lines) and lines[j + 1].strip() != '':
                    # Don't add blank if next is heading or code fence
                    next_is_heading = re.match(r'^#+\s', lines[j + 1])
                    next_is_fence = lines[j + 1].strip().startswith('```')
                    if not (next_is_heading or next_is_fence):
                        fixed_lines.append('')
                        violations_fixed += 1
                
                i = j
        
        else:
            fixed_lines.append(line)
        
        i += 1
    
    return '\n'.join(fixed_lines), violations_fixed


def fix_list_numbering(content: str) -> Tuple[str, int]:
    """Fix MD029: Ordered list item numbering should be sequential."""
    lines = content.split('\n')
    fixed_lines = []
    violations_fixed = 0
    in_ordered_list = False
    current_number = 1
    
    for line in lines:
        # Check if line is ordered list item
        match = re.match(r'^(\s*)(\d+)\.\s+(.*)$', line)
        
        if match:
            indent, num, rest = match.groups()
            expected = current_number
            
            if int(num) != expected:
                line = f'{indent}{expected}. {rest}'
                violations_fixed += 1
            
            current_number += 1
            in_ordered_list = True
        else:
            # Reset counter if we exit the list
            if in_ordered_list and line.strip() and not line.startswith(' '):
                current_number = 1
                in_ordered_list = False
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines), violations_fixed


def process_file(file_path: Path) -> bool:
    """Process a single markdown file."""
    try:
        # Read with UTF-8 encoding
        content = file_path.read_text(encoding='utf-8')
        
        # Apply fixes
        content, violations1 = fix_markdown_violations(content)
        content, violations2 = fix_list_numbering(content)
        
        total_violations = violations1 + violations2
        
        if total_violations > 0:
            # Write back
            file_path.write_text(content, encoding='utf-8')
            print(f'✅ Fixed {total_violations} violations in {file_path.name}')
            return True
        else:
            print(f'✨ No violations found in {file_path.name}')
            return False
    
    except Exception as e:
        print(f'❌ Error processing {file_path.name}: {e}')
        return False


def main():
    """Main entry point."""
    # Get files to process from command line or use defaults
    if len(sys.argv) > 1:
        files = [Path(arg) for arg in sys.argv[1:]]
    else:
        # Default: Fix the 5 files mentioned by CodeRabbit
        reports_dir = Path(__file__).parent.parent / 'docs' / 'archived' / 'DAILY_PROGRESS_REPORTS'
        files = [
            reports_dir / '2025-11-11-comprehensive-fixes-pr273-272.md',
            reports_dir / '2025-11-11_COMPREHENSIVE_5_DAY_COMPLETION.md',
            reports_dir / '2025-11-11_Phase_1_Memory_Budget_Fixes.md',
            reports_dir / '2025-11-11_Phase_2_Lint_Fixes_Complete.md',
            reports_dir / '2025-11-11_FINAL_STATUS_PR273.md',
        ]
    
    # Filter to existing files
    files = [f for f in files if f.exists()]
    
    if not files:
        print('❌ No files found to process')
        return 1
    
    print(f'🔧 Processing {len(files)} markdown file(s)...\n')
    
    fixed_count = 0
    for file_path in files:
        if process_file(file_path):
            fixed_count += 1
    
    print(f'\n✅ Fixed {fixed_count}/{len(files)} file(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
