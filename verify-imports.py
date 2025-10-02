#!/usr/bin/env python3
"""
Verify Imports
Runs the import analysis tool
"""

import subprocess
import sys
import os

# ANSI color codes
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{CYAN}{'=' * 40}")
    print(text)
    print(f"{'=' * 40}{RESET}\n")

def main():
    print_header("Verifying Imports")
    
    # Check if analyze-imports.js exists
    if not os.path.exists("analyze-imports.js"):
        print(f"{RED}❌ Error: analyze-imports.js not found{RESET}\n")
        sys.exit(1)
    
    # Run the analysis
    try:
        result = subprocess.run(
            ['node', 'analyze-imports.js'],
            capture_output=False,
            text=True
        )
        
        exit_code = result.returncode
        
        print()
        if exit_code == 0:
            print(f"{GREEN}✅ All imports are valid!{RESET}\n")
        else:
            print(f"{YELLOW}⚠️  Import issues found - see report above{RESET}\n")
        
        sys.exit(exit_code)
        
    except FileNotFoundError:
        print(f"{RED}❌ Error: Node.js not found. Please install Node.js{RESET}\n")
        sys.exit(1)
    except Exception as e:
        print(f"{RED}❌ Error: {e}{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
