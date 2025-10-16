#!/usr/bin/env python3
"""
Install Missing Packages
Installs all packages identified as missing in import analysis
"""

import subprocess
import sys

# ANSI color codes
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
GRAY = '\033[90m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{CYAN}{'=' * 40}")
    print(text)
    print(f"{'=' * 40}{RESET}\n")

def install_package(package, dev=False):
    """Install a single package using npm"""
    cmd = ['npm', 'install']
    if dev:
        cmd.append('--save-dev')
    cmd.extend([package, '--silent'])
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False

def main():
    # Production dependencies
    prod_packages = [
        "express",
        "cors",
        "helmet",
        "express-rate-limit",
        "express-mongo-sanitize",
        "compression",
        "morgan",
        "cookie-parser",
        "unified",
        "isomorphic-dompurify",
        "winston",
        "validator",
        "xss"
    ]
    
    # Dev dependencies
    dev_packages = [
        "@jest/globals",
        "jest-mock"
    ]
    
    total_packages = len(prod_packages) + len(dev_packages)
    installed = 0
    failed = 0
    
    print_header("Installing Missing Packages")
    
    print(f"{YELLOW}Production packages to install: {len(prod_packages)}{RESET}")
    print(f"{YELLOW}Dev packages to install: {len(dev_packages)}{RESET}\n")
    
    # Install production packages
    print(f"{GREEN}Installing production packages...{RESET}")
    print(f"{GRAY}{'---' * 13}{RESET}")
    
    for i, pkg in enumerate(prod_packages, 1):
        print(f"  {GRAY}[{i}/{total_packages}] Installing {pkg}...{RESET}", end=' ', flush=True)
        
        if install_package(pkg, dev=False):
            print(f"{GREEN}✅{RESET}")
            installed += 1
        else:
            print(f"{RED}❌{RESET}")
            print(f"    {RED}Error: Failed to install {pkg}{RESET}")
            failed += 1
    
    print()
    
    # Install dev packages
    print(f"{GREEN}Installing dev packages...{RESET}")
    print(f"{GRAY}{'---' * 13}{RESET}")
    
    for i, pkg in enumerate(dev_packages, len(prod_packages) + 1):
        print(f"  {GRAY}[{i}/{total_packages}] Installing {pkg}...{RESET}", end=' ', flush=True)
        
        if install_package(pkg, dev=True):
            print(f"{GREEN}✅{RESET}")
            installed += 1
        else:
            print(f"{RED}❌{RESET}")
            print(f"    {RED}Error: Failed to install {pkg}{RESET}")
            failed += 1
    
    # Summary
    print_header("Installation Complete")
    
    print(f"{GREEN}✅ Installed: {installed} packages{RESET}")
    if failed > 0:
        print(f"{RED}❌ Failed: {failed} packages{RESET}")
    print()
    
    if failed == 0:
        print(f"{GREEN}🎉 All packages installed successfully!{RESET}\n")
        sys.exit(0)
    else:
        print(f"{YELLOW}⚠️  Some packages failed to install{RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
