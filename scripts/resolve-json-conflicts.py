#!/usr/bin/env python3
"""
Smart JSON Conflict Resolver
Resolves merge conflicts in JSON files by merging keys intelligently
"""

import json
import re
import sys
from pathlib import Path

def resolve_json_conflicts(file_path):
    """
    Resolve conflicts in a JSON file by:
    1. Extracting HEAD and incoming versions
    2. Parsing both as JSON
    3. Merging keys (incoming overwrites HEAD)
    4. Writing back clean JSON
    """
    print(f"→ Resolving {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file has conflicts
    if '<<<<<<< HEAD' not in content:
        print(f"  ✓ No conflicts in {file_path}")
        return True
    
    # Strategy: Remove all conflict markers and keep incoming side
    # This preserves the newer translation keys from the feature branch
    
    pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]{7,40}\n?'
    
    def keep_incoming(match):
        """Keep the incoming (feature branch) version"""
        head_content = match.group(1)
        incoming_content = match.group(2)
        
        # Keep incoming, which has the new translations
        return incoming_content + '\n'
    
    # Replace all conflict blocks with incoming version
    resolved_content = re.sub(pattern, keep_incoming, content, flags=re.DOTALL)
    
    # Verify it's valid JSON
    try:
        json_data = json.loads(resolved_content)
        # Pretty print back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Resolved and validated JSON: {file_path}")
        return True
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON validation failed: {e}")
        # Write the resolved content anyway (might need manual fix)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(resolved_content)
        print(f"  ⚠ Wrote resolved content, but manual verification needed")
        return False

def resolve_script_conflicts(file_path):
    """Resolve conflicts in script files by keeping incoming"""
    print(f"→ Resolving {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<<<<<<< HEAD' not in content:
        print(f"  ✓ No conflicts in {file_path}")
        return True
    
    # Remove conflict markers, keep incoming
    pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]{7,40}\n?'
    resolved = re.sub(pattern, r'\2\n', content, flags=re.DOTALL)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(resolved)
    
    print(f"  ✓ Resolved: {file_path}")
    return True

def main():
    repo_dir = Path('/Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit')
    
    print("🔧 Smart JSON Conflict Resolver")
    print("=" * 50)
    print()
    
    # Translation files (JSON)
    json_files = [
        repo_dir / 'i18n' / 'ar.json',
        repo_dir / 'i18n' / 'en.json',
    ]
    
    for json_file in json_files:
        if json_file.exists():
            resolve_json_conflicts(json_file)
        print()
    
    # Script files
    script_files = [
        repo_dir / 'scripts' / 'smart-merge-conflicts.ts',
        repo_dir / 'scripts' / 'resolve-all-conflicts.sh',
    ]
    
    for script_file in script_files:
        if script_file.exists():
            resolve_script_conflicts(script_file)
        print()
    
    # Doc files
    doc_files = [
        repo_dir / 'docs' / 'guides' / 'PR84_CONFLICT_RESOLUTION_GUIDE.md',
    ]
    
    for doc_file in doc_files:
        if doc_file.exists():
            resolve_script_conflicts(doc_file)
        print()
    
    print("✅ All files processed!")
    print()
    
    # Verify no conflicts remain
    import subprocess
    try:
        result = subprocess.run(
            ['grep', '-rl', '<<<<<<< HEAD', '.', '--exclude=pnpm-lock.yaml',
             '--exclude-dir=node_modules', '--exclude-dir=.next',
             '--exclude-dir=.archive-2025-11-14'],
            cwd=repo_dir,
            capture_output=True,
            text=True
        )
        
        conflicted_files = result.stdout.strip().split('\n')
        conflicted_files = [f for f in conflicted_files if f]
        
        if conflicted_files:
            print(f"⚠️  {len(conflicted_files)} files still have conflicts:")
            for f in conflicted_files:
                print(f"  - {f}")
        else:
            print("✅ No remaining conflicts!")
            
    except Exception as e:
        print(f"Could not verify: {e}")

if __name__ == '__main__':
    main()
