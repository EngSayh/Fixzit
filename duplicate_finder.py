#!/usr/bin/env python3
import os
import sys
import argparse
import time
from collections import defaultdict, Counter
from typing import Dict, List, Tuple

# Types
Occurrence = Tuple[str, int]  # (relative_file_path, line_number)

# Heuristics and defaults
DEFAULT_EXCLUDE_DIRS = {
    '.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.cache',
    '.venv', 'venv', 'target', 'bin', 'obj', 'coverage', '__pycache__',
    'ios', 'android', 'Pods', 'vendor', '.gradle', '.idea', '.vscode',
}

DEFAULT_EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'go.sum',
    'Gemfile.lock', 'poetry.lock', 'composer.lock', 'Podfile.lock',
    'npm-shrinkwrap.json', 'duplicate_report.txt'
}

BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp', '.avif',
    '.mp3', '.mp4', '.mov', '.avi', '.mkv', '.wav', '.flac',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.gz', '.tar', '.tgz', '.bz2', '.7z', '.rar',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.jar', '.class', '.wasm', '.so', '.dylib', '.o', '.a', '.lib', '.dll',
}

PRINTABLE_WHITELIST = set(range(32, 127)) | {9, 10, 13}


def is_probably_binary(file_path: str, sample_size: int = 4096) -> bool:
    try:
        with open(file_path, 'rb') as f:
            sample = f.read(sample_size)
    except Exception:
        return True
    if b'\x00' in sample:
        return True
    if not sample:
        return False
    non_printable = sum((b not in PRINTABLE_WHITELIST) for b in sample)
    return (non_printable / len(sample)) > 0.30


def normalize_line(line: str) -> str:
    # Remove leading/trailing whitespace; keep internal spacing
    return line.strip()


def should_skip_line(line_norm: str, min_len: int) -> bool:
    if not line_norm:
        return True
    if len(line_norm) < min_len:
        return True
    # Skip lines that are just braces or delimiters
    if line_norm in {'{', '}', '];', ');', '],', ');', '],', ');', ')', '];', ';'}:
        return True
    return False


def scan_files(root: str, exclude_dirs: List[str], exclude_files: List[str], max_file_size_bytes: int) -> List[str]:
    root = os.path.abspath(root)
    files: List[str] = []
    exclude_dir_set = set(exclude_dirs)
    exclude_file_set = set(exclude_files)
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dir_set]
        for filename in filenames:
            if filename in exclude_file_set:
                continue
            full_path = os.path.join(dirpath, filename)
            try:
                st = os.stat(full_path)
            except Exception:
                continue
            if st.st_size > max_file_size_bytes:
                continue
            _, ext = os.path.splitext(filename)
            if ext.lower() in BINARY_EXTENSIONS:
                continue
            if is_probably_binary(full_path):
                continue
            files.append(full_path)
    return files


def index_duplicates(
    files: List[str],
    root: str,
    min_line_length: int,
    block_size: int,
    min_block_total_length: int,
) -> Tuple[Dict[str, List[Occurrence]], Dict[str, List[Occurrence]], int, int]:
    line_to_occurrences: Dict[str, List[Occurrence]] = defaultdict(list)
    block_to_occurrences: Dict[str, List[Occurrence]] = defaultdict(list)

    total_files = 0
    total_lines = 0

    root_abs = os.path.abspath(root)

    for file_index, file_path in enumerate(files, start=1):
        rel_path = os.path.relpath(file_path, root_abs)
        total_files += 1
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                raw_lines = f.readlines()
        except Exception:
            continue

        total_lines += len(raw_lines)

        # Prepare normalized lines for block processing
        normalized_lines = [normalize_line(line) for line in raw_lines]

        # Index single-line duplicates
        for i, line_norm in enumerate(normalized_lines, start=1):
            if should_skip_line(line_norm, min_line_length):
                continue
            line_to_occurrences[line_norm].append((rel_path, i))

        # Index block duplicates
        if block_size > 1 and len(normalized_lines) >= block_size:
            for start in range(0, len(normalized_lines) - block_size + 1):
                window = normalized_lines[start:start + block_size]
                if any(not w for w in window):
                    continue
                if sum(len(w) for w in window) < min_block_total_length:
                    continue
                key = '\n'.join(window)
                block_to_occurrences[key].append((rel_path, start + 1))

        if file_index % 200 == 0:
            print(f"Scanned {file_index} files...")

    # Filter to only duplicates (occurrence count >= 2)
    line_to_occurrences = {k: v for k, v in line_to_occurrences.items() if len(v) >= 2}
    block_to_occurrences = {k: v for k, v in block_to_occurrences.items() if len(v) >= 2}

    return line_to_occurrences, block_to_occurrences, total_files, total_lines


def write_report(
    out_path: str,
    root: str,
    min_line_length: int,
    block_size: int,
    min_block_total_length: int,
    line_dups: Dict[str, List[Occurrence]],
    block_dups: Dict[str, List[Occurrence]],
    total_files: int,
    total_lines: int,
) -> None:
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write(f"Duplicate scan report\n")
        out.write(f"Generated: {ts}\n")
        out.write(f"Root: {os.path.abspath(root)}\n")
        out.write(f"Config: min_line_length={min_line_length}, block_size={block_size}, min_block_total_length={min_block_total_length}\n")
        out.write(f"Scanned files: {total_files}, total lines: {total_lines}\n")
        out.write("\n")

        # Summary counts
        out.write(f"Duplicate 3-line blocks: {len(block_dups)} groups\n")
        block_occ_total = sum(len(v) for v in block_dups.values())
        out.write(f"Total block occurrences: {block_occ_total}\n")
        out.write(f"Duplicate lines: {len(line_dups)} groups\n")
        line_occ_total = sum(len(v) for v in line_dups.values())
        out.write(f"Total line occurrences: {line_occ_total}\n")
        out.write("\n\n")

        # Detailed section for block duplicates
        out.write("=== Duplicate 3-line blocks (details) ===\n\n")
        # Sort by number of occurrences desc, then by content
        for key, occs in sorted(block_dups.items(), key=lambda kv: (-len(kv[1]), kv[0])):
            out.write(f"Occurrences: {len(occs)}\n")
            out.write("Block:\n")
            out.write(key + "\n")
            out.write("Locations:\n")
            for rel_path, start_line in occs:
                out.write(f"- {rel_path}:{start_line}\n")
            out.write("\n---\n\n")

        # Detailed section for line duplicates
        out.write("=== Duplicate lines (details) ===\n\n")
        for key, occs in sorted(line_dups.items(), key=lambda kv: (-len(kv[1]), kv[0])):
            out.write(f"Occurrences: {len(occs)}\n")
            out.write("Line:\n")
            out.write(key + "\n")
            out.write("Locations:\n")
            for rel_path, line_no in occs:
                out.write(f"- {rel_path}:{line_no}\n")
            out.write("\n---\n\n")


def print_console_summary(
    line_dups: Dict[str, List[Occurrence]],
    block_dups: Dict[str, List[Occurrence]],
    total_files: int,
    total_lines: int,
    top_n: int = 10,
) -> None:
    print("\nScan summary:")
    print(f"- Files scanned: {total_files}")
    print(f"- Total lines: {total_lines}")
    print(f"- Duplicate 3-line block groups: {len(block_dups)}")
    print(f"- Duplicate line groups: {len(line_dups)}")

    def top_items(d: Dict[str, List[Occurrence]], n: int):
        return sorted(d.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:n]

    if block_dups:
        print("\nTop duplicate 3-line blocks:")
        for key, occs in top_items(block_dups, top_n):
            print(f"Occurrences: {len(occs)} | First lines: {key.splitlines()[0][:120]}")
            for rel_path, start_line in occs[:10]:
                print(f"  - {rel_path}:{start_line}")
            if len(occs) > 10:
                print(f"  ... and {len(occs) - 10} more")

    if line_dups:
        print("\nTop duplicate lines:")
        for key, occs in top_items(line_dups, top_n):
            print(f"Occurrences: {len(occs)} | Line: {key[:120]}")
            for rel_path, line_no in occs[:10]:
                print(f"  - {rel_path}:{line_no}")
            if len(occs) > 10:
                print(f"  ... and {len(occs) - 10} more")


def main():
    parser = argparse.ArgumentParser(description='Find duplicate lines and 3-line blocks across a codebase.')
    parser.add_argument('--root', type=str, default='.', help='Root directory to scan')
    parser.add_argument('--out', type=str, default='duplicate_report.txt', help='Path to write the duplicate report')
    parser.add_argument('--min-line-length', type=int, default=20, help='Minimum normalized line length to consider')
    parser.add_argument('--block-size', type=int, default=3, help='Consecutive line block size')
    parser.add_argument('--min-block-total-length', type=int, default=50, help='Minimum total length across block lines')
    parser.add_argument('--exclude-dir', action='append', default=[], help='Directory name to exclude (can repeat)')
    parser.add_argument('--exclude-file', action='append', default=[], help='File name to exclude (can repeat)')
    parser.add_argument('--max-file-size-bytes', type=int, default=2 * 1024 * 1024, help='Skip files larger than this size')

    args = parser.parse_args()

    exclude_dirs = list(DEFAULT_EXCLUDE_DIRS) + args.exclude_dir
    exclude_files = list(DEFAULT_EXCLUDE_FILES) + args.exclude_file

    start_time = time.time()

    files = scan_files(args.root, exclude_dirs, exclude_files, args.max_file_size_bytes)
    print(f"Discovered {len(files)} candidate text files to scan.")

    line_dups, block_dups, total_files, total_lines = index_duplicates(
        files=files,
        root=args.root,
        min_line_length=args.min_line_length,
        block_size=args.block_size,
        min_block_total_length=args.min_block_total_length,
    )

    write_report(
        out_path=args.out,
        root=args.root,
        min_line_length=args.min_line_length,
        block_size=args.block_size,
        min_block_total_length=args.min_block_total_length,
        line_dups=line_dups,
        block_dups=block_dups,
        total_files=total_files,
        total_lines=total_lines,
    )

    elapsed = time.time() - start_time
    print_console_summary(line_dups, block_dups, total_files, total_lines)
    print(f"\nWrote report to: {os.path.abspath(args.out)}")
    print(f"Elapsed: {elapsed:.2f}s")


if __name__ == '__main__':
    main()
