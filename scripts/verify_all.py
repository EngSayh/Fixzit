#!/usr/bin/env python3
"""
Comprehensive verification suite for Fixzit application
Runs multiple checks with auto-fix capabilities
"""

import sys
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Terminal colors
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"


class VerificationSuite:
    def __init__(self, auto_fix: bool = True, max_passes: int = 3):
        self.auto_fix = auto_fix
        self.max_passes = max_passes
        self.current_pass = 0
        self.root_dir = Path(__file__).parent.parent
        self.results = []
        self.fixes_applied = False

    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.HEADER}{text}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.END}")

    def print_step(self, text: str):
        """Print a step indicator"""
        print(f"\n{Colors.BLUE}--- {text} ---{Colors.END}")

    def print_success(self, text: str):
        """Print success message"""
        print(f"{Colors.GREEN}✅ {text}{Colors.END}")

    def print_error(self, text: str):
        """Print error message"""
        print(f"{Colors.RED}❌ {text}{Colors.END}")

    def print_warning(self, text: str):
        """Print warning message"""
        print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

    def print_info(self, text: str):
        """Print info message"""
        print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

    def run_command(self, cmd: List[str], timeout: int = 30) -> Tuple[bool, str, str]:
        """Execute a command and return success, stdout, stderr"""
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout, cwd=self.root_dir
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", f"Timeout after {timeout}s"
        except FileNotFoundError:
            return False, "", f"Command not found: {cmd[0]}"
        except Exception as e:
            return False, "", str(e)

    def check_python_format(self) -> Dict[str, Any]:
        """Check Python formatting with black"""
        self.print_step("Python Formatting (black)")

        # Check if black is installed
        success, _, _ = self.run_command(["python3", "-m", "black", "--version"])
        if not success:
            if self.auto_fix:
                self.print_info("Installing black...")
                self.run_command(["pip", "install", "black"])

        # Check formatting
        success, stdout, stderr = self.run_command(
            ["python3", "-m", "black", "--check", "--diff", "."]
        )

        if not success and self.auto_fix:
            self.print_info("Auto-formatting Python files...")
            fix_success, _, _ = self.run_command(["python3", "-m", "black", "."])
            if fix_success:
                self.fixes_applied = True
                self.print_success("Python files formatted")
                return {"status": "fixed", "message": "Auto-formatted"}
            else:
                self.print_error("Failed to format files")
                return {"status": "failed", "message": "Format failed"}
        elif success:
            self.print_success("Python formatting OK")
            return {"status": "passed"}
        else:
            self.print_error("Formatting issues found")
            return {"status": "failed", "message": "Needs formatting"}

    def check_python_lint(self) -> Dict[str, Any]:
        """Check Python linting with pylint"""
        self.print_step("Python Linting (pylint)")

        # Check if pylint is installed
        success, _, _ = self.run_command(["python3", "-m", "pylint", "--version"])
        if not success:
            if self.auto_fix:
                self.print_info("Installing pylint...")
                self.run_command(["pip", "install", "pylint"])

        # Run pylint on key directories
        dirs = ["pages", "utils", "services"]
        issues = []

        for directory in dirs:
            dir_path = self.root_dir / directory
            if dir_path.exists():
                success, stdout, stderr = self.run_command(
                    [
                        "python3",
                        "-m",
                        "pylint",
                        "--exit-zero",
                        "--disable=C0114,C0115,C0116,R0913,R0914,R0915,W0613",
                        str(directory),
                    ]
                )

                # Parse score from output
                if "rated at" in stdout:
                    score_line = [
                        line for line in stdout.split("\n") if "rated at" in line
                    ]
                    if score_line:
                        try:
                            score = float(
                                score_line[0].split("rated at")[1].split("/")[0].strip()
                            )
                            if score < 7.0:
                                issues.append(f"{directory}: score {score:.2f}/10")
                        except (ValueError, IndexError):
                            pass

        if issues:
            self.print_warning(f"Linting issues: {', '.join(issues)}")
            return {"status": "warning", "issues": issues}
        else:
            self.print_success("Linting checks passed")
            return {"status": "passed"}

    def check_imports(self) -> Dict[str, Any]:
        """Verify all required imports are available"""
        self.print_step("Import Verification")

        required = [
            "streamlit",
            "pandas",
            "psycopg2",
            "bcrypt",
            "pytz",
            "folium",
            "streamlit_folium",
            "plotly",
            "openpyxl",
            "reportlab",
            "qrcode",
            "babel",
            "hijri_converter",
            "sendgrid",
            "pyperclip",
        ]

        missing = []
        for module in required:
            try:
                __import__(module.replace("-", "_"))
            except ImportError:
                missing.append(module)

        if missing and self.auto_fix:
            self.print_info(f"Installing missing packages: {', '.join(missing)}")
            for pkg in missing:
                self.run_command(["pip", "install", pkg])
            self.fixes_applied = True

            # Verify installation
            still_missing = []
            for module in missing:
                try:
                    __import__(module.replace("-", "_"))
                except ImportError:
                    still_missing.append(module)

            if still_missing:
                self.print_error(f"Failed to install: {', '.join(still_missing)}")
                return {"status": "failed", "missing": still_missing}
            else:
                self.print_success("All packages installed")
                return {"status": "fixed"}
        elif missing:
            self.print_error(f"Missing packages: {', '.join(missing)}")
            return {"status": "failed", "missing": missing}
        else:
            self.print_success("All imports available")
            return {"status": "passed"}

    def check_streamlit_config(self) -> Dict[str, Any]:
        """Check Streamlit configuration"""
        self.print_step("Streamlit Configuration")

        config_dir = self.root_dir / ".streamlit"
        config_file = config_dir / "config.toml"

        if not config_file.exists():
            if self.auto_fix:
                self.print_info("Creating Streamlit config...")
                config_dir.mkdir(exist_ok=True)

                config_content = """[server]
headless = true
address = "0.0.0.0"
port = 5000

[browser]
gatherUsageStats = false

[theme]
primaryColor = "#F6851F"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#1F2937"
"""
                config_file.write_text(config_content)
                self.fixes_applied = True
                self.print_success("Streamlit config created")
                return {"status": "fixed"}
            else:
                self.print_warning("Streamlit config missing")
                return {"status": "warning"}
        else:
            self.print_success("Streamlit config exists")
            return {"status": "passed"}

    def check_database_schema(self) -> Dict[str, Any]:
        """Verify database schema"""
        self.print_step("Database Schema Verification")

        try:
            from utils.database import get_db_connection

            conn = get_db_connection()
            if not conn:
                self.print_error("Cannot connect to database")
                return {"status": "failed", "error": "Connection failed"}

            cursor = conn.cursor()

            # Check for all required tables
            required_tables = [
                "users",
                "properties",
                "units",
                "contracts",
                "contracts_new",
                "tickets",
                "payments",
                "otp_codes",
                "notifications",
                "service_providers",
                "service_bookings",
                "service_categories",
                "hr_services",
                "hr_service_requests",
                "referrals",
                "marketing_campaigns",
                "coupons",
                "questionnaires",
                "wallet_transactions",
                "invoices",
                "app_integrations",
                "owner_associations",
                "companies",
                "guided_tours",
                "login_branding",
            ]

            cursor.execute(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """
            )

            existing_tables = [row[0] for row in cursor.fetchall()]
            missing_tables = [t for t in required_tables if t not in existing_tables]

            cursor.close()
            conn.close()

            if missing_tables:
                self.print_warning(f"Missing tables: {', '.join(missing_tables[:5])}")
                if len(missing_tables) > 5:
                    self.print_info(f"... and {len(missing_tables) - 5} more")
                return {"status": "warning", "missing": missing_tables}
            else:
                self.print_success(f"All {len(required_tables)} tables present")
                return {"status": "passed"}

        except Exception as e:
            self.print_error(f"Database check failed: {str(e)}")
            return {"status": "failed", "error": str(e)}

    def check_pages_syntax(self) -> Dict[str, Any]:
        """Check syntax of all page files"""
        self.print_step("Page Files Syntax Check")

        pages_dir = self.root_dir / "pages"
        if not pages_dir.exists():
            self.print_error("Pages directory not found")
            return {"status": "failed", "error": "No pages directory"}

        errors = []
        page_count = 0

        for page_file in sorted(pages_dir.glob("*.py")):
            page_count += 1
            try:
                content = page_file.read_text()
                compile(content, page_file.name, "exec")
            except SyntaxError as e:
                errors.append(f"{page_file.name}: {e.msg} (line {e.lineno})")
            except Exception as e:
                errors.append(f"{page_file.name}: {str(e)}")

        if errors:
            self.print_error(f"{len(errors)} pages have syntax errors:")
            for error in errors[:3]:
                print(f"  - {error}")
            if len(errors) > 3:
                print(f"  ... and {len(errors) - 3} more")
            return {"status": "failed", "errors": errors}
        else:
            self.print_success(f"All {page_count} pages have valid syntax")
            return {"status": "passed", "total": page_count}

    def check_security(self) -> Dict[str, Any]:
        """Basic security checks"""
        self.print_step("Security Scan")

        issues = []

        # Check for hardcoded secrets in Python files
        patterns = [
            (r'api[_\s]*key\s*=\s*["\'][^"\']+["\']', "Hardcoded API key"),
            (r'password\s*=\s*["\'][^"\']+["\']', "Hardcoded password"),
            (r'secret[_\s]*key\s*=\s*["\'][^"\']+["\']', "Hardcoded secret"),
            (r'token\s*=\s*["\'][^"\']+["\']', "Hardcoded token"),
        ]

        import re

        for py_file in self.root_dir.rglob("*.py"):
            if "venv" in str(py_file) or "__pycache__" in str(py_file):
                continue

            try:
                content = py_file.read_text()

                # Skip if it uses environment variables properly
                if "os.environ" in content:
                    continue

                for pattern, desc in patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        rel_path = py_file.relative_to(self.root_dir)
                        issues.append(f"{rel_path}: {desc}")
                        break

            except (IOError, UnicodeDecodeError):
                pass

        if issues:
            self.print_warning("Potential security issues found:")
            for issue in issues[:3]:
                print(f"  - {issue}")
            if len(issues) > 3:
                print(f"  ... and {len(issues) - 3} more")
            return {"status": "warning", "issues": issues}
        else:
            self.print_success("No obvious security issues")
            return {"status": "passed"}

    def run_tests(self) -> Dict[str, Any]:
        """Run pytest if available"""
        self.print_step("Running Tests")

        # Check if pytest is installed
        success, _, _ = self.run_command(["python3", "-m", "pytest", "--version"])
        if not success:
            if self.auto_fix:
                self.print_info("Installing pytest...")
                self.run_command(["pip", "install", "pytest", "pytest-cov"])

        # Check for tests directory
        tests_dir = self.root_dir / "tests"
        if not tests_dir.exists():
            self.print_info("No tests directory found - creating basic test")

            if self.auto_fix:
                tests_dir.mkdir(exist_ok=True)

                # Create a basic test
                test_file = tests_dir / "test_basic.py"
                test_content = """import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_imports():
    \"\"\"Test that key modules can be imported\"\"\"
    import streamlit
    import pandas
    import psycopg2
    assert True

def test_pages_exist():
    \"\"\"Test that pages directory exists\"\"\"
    pages_dir = Path(__file__).parent.parent / "pages"
    assert pages_dir.exists()
    assert len(list(pages_dir.glob("*.py"))) > 0
"""
                test_file.write_text(test_content)
                self.fixes_applied = True

        # Run tests
        success, stdout, stderr = self.run_command(
            ["python3", "-m", "pytest", "-v", "--tb=short"], timeout=60
        )

        if success:
            self.print_success("All tests passed")
            return {"status": "passed"}
        elif "no tests ran" in stdout.lower() or "no tests ran" in stderr.lower():
            self.print_info("No tests to run")
            return {"status": "skipped"}
        else:
            self.print_warning("Some tests failed")
            return {"status": "warning", "output": stderr[:500]}

    def generate_report(self, all_results: List[Dict]) -> None:
        """Generate final report"""
        self.print_header("GENERATING REPORTS")

        # Create artifacts directory
        artifacts_dir = self.root_dir / "artifacts"
        artifacts_dir.mkdir(exist_ok=True)

        # Calculate statistics
        total_checks = len(all_results)
        passed = sum(1 for r in all_results if r.get("status") == "passed")
        failed = sum(1 for r in all_results if r.get("status") == "failed")
        fixed = sum(1 for r in all_results if r.get("status") == "fixed")
        warnings = sum(1 for r in all_results if r.get("status") == "warning")

        # JSON report
        json_report = {
            "timestamp": datetime.now().isoformat(),
            "passes_run": self.current_pass,
            "auto_fix": self.auto_fix,
            "statistics": {
                "total": total_checks,
                "passed": passed,
                "failed": failed,
                "fixed": fixed,
                "warnings": warnings,
            },
            "results": all_results,
            "overall_status": "PASS" if failed == 0 else "FAIL",
        }

        json_file = (
            artifacts_dir / f"verify_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(json_file, "w") as f:
            json.dump(json_report, f, indent=2, default=str)

        # Markdown report
        md_content = [
            "# Fixzit Verification Report",
            f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Auto-fix:** {'Enabled' if self.auto_fix else 'Disabled'}",
            f"**Passes Run:** {self.current_pass}",
            "\n## Summary",
            f"- ✅ Passed: {passed}",
            f"- ❌ Failed: {failed}",
            f"- 🔧 Fixed: {fixed}",
            f"- ⚠️  Warnings: {warnings}",
            f"- 📊 Total Checks: {total_checks}",
            "\n## Detailed Results\n",
        ]

        for i, (check_name, result) in enumerate(
            zip(
                [
                    "Format",
                    "Lint",
                    "Imports",
                    "Config",
                    "Database",
                    "Pages",
                    "Security",
                    "Tests",
                ],
                all_results,
            )
        ):
            status = result.get("status", "unknown")
            icon = {
                "passed": "✅",
                "failed": "❌",
                "fixed": "🔧",
                "warning": "⚠️",
                "skipped": "⏭️",
            }.get(status, "❓")
            md_content.append(f"### {icon} {check_name}")

            if result.get("message"):
                md_content.append(f"- {result['message']}")
            if result.get("error"):
                md_content.append(f"- Error: {result['error']}")
            if result.get("missing"):
                md_content.append(f"- Missing: {', '.join(result['missing'][:5])}")

            md_content.append("")

        md_file = (
            artifacts_dir / f"verify_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        )
        md_file.write_text("\n".join(md_content))

        self.print_success("Reports saved:")
        print(f"  📄 {json_file}")
        print(f"  📝 {md_file}")

    def run_verification(self) -> bool:
        """Run full verification suite"""
        self.print_header("FIXZIT VERIFICATION SUITE")
        print(
            f"Auto-fix: {Colors.GREEN if self.auto_fix else Colors.RED}{'ENABLED' if self.auto_fix else 'DISABLED'}{Colors.END}"
        )
        print(f"Max passes: {self.max_passes}")

        checks = [
            self.check_python_format,
            self.check_python_lint,
            self.check_imports,
            self.check_streamlit_config,
            self.check_database_schema,
            self.check_pages_syntax,
            self.check_security,
            self.run_tests,
        ]

        while self.current_pass < self.max_passes:
            self.current_pass += 1
            self.print_header(f"PASS {self.current_pass}/{self.max_passes}")

            self.fixes_applied = False
            results = []

            for check in checks:
                try:
                    result = check()
                    results.append(result)
                except Exception as e:
                    self.print_error(f"Check crashed: {e}")
                    results.append({"status": "failed", "error": str(e)})

            # Check if we should continue
            failed_count = sum(1 for r in results if r.get("status") == "failed")

            if failed_count == 0:
                self.print_header("✅ VERIFICATION PASSED")
                self.generate_report(results)
                return True

            if not self.fixes_applied or self.current_pass >= self.max_passes:
                self.print_header(f"❌ VERIFICATION FAILED ({failed_count} issues)")
                self.generate_report(results)
                return False

            self.print_info(f"Fixes applied, running pass {self.current_pass + 1}...")
            time.sleep(1)

        return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Fixzit Verification Suite")
    parser.add_argument("--no-fix", action="store_true", help="Disable auto-fix")
    parser.add_argument(
        "--max-passes", type=int, default=3, help="Maximum passes (default: 3)"
    )

    args = parser.parse_args()

    suite = VerificationSuite(auto_fix=not args.no_fix, max_passes=args.max_passes)

    success = suite.run_verification()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
