#!/bin/bash
# Duplicate Detection - CI/CD integration script
# Run: ./scripts/detect-duplicates.sh [--fail-on-duplicates]

set -e

# Check Python availability and version
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Error: python3 not found"
  echo "   Please install Python 3.6+ to run duplicate detection"
  exit 1
fi

# Verify Python version (require 3.6+) - use .format() for Python 2 compatibility
python_version=$(python3 -c 'import sys; print("{0}.{1}".format(sys.version_info.major, sys.version_info.minor))' 2>/dev/null || echo "0.0")
required_version="3.6"
if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
  echo "❌ Error: Python $python_version detected, but Python $required_version+ is required"
  exit 1
fi

FAIL_ON_DUPLICATES=false
if [ "$1" == "--fail-on-duplicates" ]; then
  FAIL_ON_DUPLICATES=true
fi

REPORT_FILE="duplicate-detection-report.json"
THRESHOLD_MB=${THRESHOLD_MB:-1}  # Fail if duplicates exceed this threshold
export THRESHOLD_MB

echo "=== Duplicate File Detection for CI/CD ==="
echo "Python: $python_version"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Mode: $([ "$FAIL_ON_DUPLICATES" == "true" ] && echo "Strict (will fail build)" || echo "Report only")"
echo ""

# Create Python script for duplicate detection (logs to stderr, JSON to stdout)
python3 - << 'PYEOF' > "$REPORT_FILE"
import os
import hashlib
import json
from collections import defaultdict
from pathlib import Path
import sys

def get_file_hash(filepath):
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return None

def should_skip(path):
    skip_dirs = {
        'node_modules', '.next', 'dist', '.git', 
        'playwright-report', 'test-results', '__pycache__',
        'logs', 'coverage', '.archive'
    }
    skip_files = {
        'tsconfig.tsbuildinfo', 'pnpm-lock.yaml', 
        'package-lock.json', '.DS_Store', 'yarn.lock'
    }
    
    parts = Path(path).parts
    if any(d in parts for d in skip_dirs):
        return True
    if Path(path).name in skip_files:
        return True
    return False

print("Scanning files...", file=sys.stderr)

file_hashes = defaultdict(list)
total_files = 0

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if not should_skip(os.path.join(root, d))]
    
    for filename in files:
        filepath = os.path.join(root, filename)
        if should_skip(filepath):
            continue
        
        total_files += 1
        file_hash = get_file_hash(filepath)
        if file_hash:
            file_size = os.path.getsize(filepath)
            file_hashes[file_hash].append({
                'path': filepath,
                'size': file_size
            })

print(f"Scanned {total_files} files", file=sys.stderr)

# Find duplicates
duplicates = {h: files for h, files in file_hashes.items() if len(files) > 1}

if duplicates:
    print(f"\n⚠️  Found {len(duplicates)} groups of duplicate files\n", file=sys.stderr)
    
    results = []
    total_waste = 0
    
    for hash_val, files in sorted(duplicates.items(), key=lambda x: -x[1][0]['size']):
        group_size = files[0]['size']
        duplicate_count = len(files) - 1
        wasted_space = group_size * duplicate_count
        total_waste += wasted_space
        
        group = {
            'hash': hash_val,
            'size': group_size,
            'count': len(files),
            'wasted_space': wasted_space,
            'files': [f['path'] for f in files]
        }
        
        results.append(group)
        
        print(f"Duplicate Group (Hash: {hash_val[:8]}...)", file=sys.stderr)
        print(f"  Size: {group_size:,} bytes each", file=sys.stderr)
        print(f"  Count: {len(files)} copies", file=sys.stderr)
        print(f"  Waste: {wasted_space:,} bytes ({wasted_space / 1024 / 1024:.2f} MB)", file=sys.stderr)
        for f in files:
            print(f"    - {f['path']}", file=sys.stderr)
        print(file=sys.stderr)
    
    wasted_mb = total_waste / 1024 / 1024
    print(f"Total wasted space: {total_waste:,} bytes ({wasted_mb:.2f} MB)", file=sys.stderr)
    
    # Output JSON for CI/CD processing
    output = {
        'timestamp': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip(),
        'total_files_scanned': total_files,
        'duplicate_groups': len(duplicates),
        'total_wasted_bytes': total_waste,
        'total_wasted_mb': round(wasted_mb, 2),
        'duplicates': results
    }
    
    json_output = json.dumps(output, indent=2)
    print(json_output)
    
    # Exit code based on threshold
    sys.exit(1 if wasted_mb > float(os.environ.get('THRESHOLD_MB', '1')) else 0)
else:
    print("✓ No duplicate files found", file=sys.stderr)
    output = {
        'timestamp': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip(),
        'total_files_scanned': total_files,
        'duplicate_groups': 0,
        'total_wasted_bytes': 0,
        'total_wasted_mb': 0,
        'duplicates': []
    }
    print(json.dumps(output, indent=2))
    sys.exit(0)
PYEOF

# Capture exit code from Python
exit_code=$?

echo ""
echo "=== Detection Complete ==="
echo "Report saved: $REPORT_FILE"

if [ "$FAIL_ON_DUPLICATES" == "true" ] && [ $exit_code -ne 0 ]; then
  echo ""
  echo "❌ Build failed: Duplicate files exceed ${THRESHOLD_MB}MB threshold"
  echo "   Please run './scripts/cleanup-backups.sh' to clean up duplicates"
  exit 1
fi

echo "✓ Duplicate detection passed"
exit 0
