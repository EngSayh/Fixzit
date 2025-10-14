#!/usr/bin/env python3
"""
Manual duplicate key removal script
Reads TypeScript error output and removes duplicate sections
"""

import re
import subprocess

def get_duplicate_lines():
    """Get all duplicate line numbers from TypeScript errors"""
    result = subprocess.run(
        ['npm', 'run', 'typecheck'],
        capture_output=True,
        text=True,
        cwd='/workspaces/Fixzit'
    )
    
    # Combine stdout and stderr
    output = result.stdout + result.stderr
    
    duplicates = {}
    for line in output.split('\n'):
        if 'error TS1117' in line:
            match = re.search(r'i18n/dictionaries/(.*?)\.ts\((\d+),', line)
            if match:
                filename = match.group(1)
                line_num = int(match.group(2))
                if filename not in duplicates:
                    duplicates[filename] = []
                duplicates[filename].append(line_num)
    
    return duplicates

def find_section_end(lines, start_line):
    """Find the end of a section starting with an object"""
    depth = 0
    in_section = False
    
    for i in range(start_line, len(lines)):
        line = lines[i]
        
        # Count braces
        depth += line.count('{') - line.count('}')
        
        if '{' in line and not in_section:
            in_section = True
            depth = 1
        
        # When depth returns to 0, we've closed the section
        if in_section and depth == 0:
            return i
    
    return start_line

def remove_duplicates(filename):
    """Remove duplicate sections from a file"""
    filepath = f'/workspaces/Fixzit/i18n/dictionaries/{filename}.ts'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Get duplicate lines for this file
    duplicates = get_duplicate_lines()
    if filename not in duplicates:
        print(f"No duplicates found in {filename}.ts")
        return 0
    
    dup_lines = sorted(duplicates[filename], reverse=True)
    print(f"\n📝 Processing {filename}.ts: {len(dup_lines)} duplicates")
    
    removed_count = 0
    for dup_line in dup_lines:
        # Convert to 0-indexed
        line_idx = dup_line - 1
        
        if line_idx >= len(lines):
            continue
        
        # Find the key name
        match = re.match(r'\s+(\w+):\s*\{', lines[line_idx])
        if not match:
            continue
        
        key_name = match.group(1)
        
        # Find section end
        end_idx = find_section_end(lines, line_idx)
        
        if end_idx > line_idx:
            section_size = end_idx - line_idx + 1
            print(f"   ⚠️  Removing '{key_name}' at line {dup_line} ({section_size} lines)")
            
            # Remove the section
            del lines[line_idx:end_idx + 1]
            removed_count += section_size
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f"   ✅ Removed {removed_count} lines total")
    return removed_count

if __name__ == '__main__':
    print("🔍 Fixing duplicate keys in translation files...\n")
    
    total_en = remove_duplicates('en')
    total_ar = remove_duplicates('ar')
    
    print(f"\n📊 Summary:")
    print(f"   en.ts: {total_en} lines removed")
    print(f"   ar.ts: {total_ar} lines removed")
    print(f"\n✅ Done! Run 'npm run typecheck' to verify.")
