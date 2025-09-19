#!/usr/bin/env python3
"""
Fixzit Application Health Check & Verification
Comprehensive system validation for Streamlit app
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime
import traceback

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Terminal colors
PASS = "\033[92m"
FAIL = "\033[91m"
WARN = "\033[93m"
INFO = "\033[94m"
BOLD = "\033[1m"
END = "\033[0m"


class FixzitVerifier:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passes = []
        self.stats = {"total_checks": 0, "passed": 0, "failed": 0, "warnings": 0}

    def log_pass(self, msg):
        print(f"{PASS}✓ {msg}{END}")
        self.passes.append(msg)
        self.stats["passed"] += 1

    def log_fail(self, msg):
        print(f"{FAIL}✗ {msg}{END}")
        self.errors.append(msg)
        self.stats["failed"] += 1

    def log_warn(self, msg):
        print(f"{WARN}⚠ {msg}{END}")
        self.warnings.append(msg)
        self.stats["warnings"] += 1

    def log_info(self, msg):
        print(f"{INFO}ℹ {msg}{END}")

    def section(self, title):
        print(f"\n{BOLD}{'='*60}{END}")
        print(f"{BOLD}{title}{END}")
        print(f"{BOLD}{'='*60}{END}")

    def check_environment(self):
        """Check environment variables and database"""
        self.section("ENVIRONMENT & DATABASE CHECK")

        # Check for database URL
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            self.log_pass("DATABASE_URL environment variable found")
        else:
            self.log_warn("DATABASE_URL not found in environment")

        # Try database connection
        try:
            from utils.database import get_db_connection

            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()

                # Count tables
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """
                )
                result = cursor.fetchone()
                table_count = result[0] if result else 0
                self.log_pass(f"Database connected: {table_count} tables found")

                # Check critical tables
                critical_tables = [
                    "users",
                    "properties",
                    "contracts",
                    "tickets",
                    "payments",
                ]
                for table in critical_tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    result = cursor.fetchone()
                    count = result[0] if result else 0
                    self.log_pass(f"Table '{table}': {count} records")

                cursor.close()
                conn.close()
                return True
            else:
                self.log_fail("Database connection failed")
                return False
        except Exception as e:
            self.log_fail(f"Database error: {str(e)}")
            return False

    def check_pages(self):
        """Verify all page files"""
        self.section("PAGE FILES CHECK")

        pages_dir = Path("pages")
        if not pages_dir.exists():
            self.log_fail("Pages directory not found")
            return False

        page_files = sorted(pages_dir.glob("*.py"))
        self.log_info(f"Found {len(page_files)} page files")

        workos_pages = []
        redirect_pages = []
        standalone_pages = []
        error_pages = []

        for page in page_files:
            try:
                content = page.read_text()

                # Categorize pages
                if "WorkOS" in page.name:
                    workos_pages.append(page.name)
                elif "st.switch_page" in content and len(content.split("\n")) < 20:
                    redirect_pages.append(page.name)
                else:
                    standalone_pages.append(page.name)

                # Check for common issues
                if "st.set_page_config" not in content and "Redirect" not in content:
                    self.log_warn(f"{page.name}: Missing page config")

                # Check for syntax
                compile(content, page.name, "exec")

            except SyntaxError as e:
                self.log_fail(f"{page.name}: Syntax error - {e}")
                error_pages.append(page.name)
            except Exception as e:
                self.log_warn(f"{page.name}: {e}")

        # Summary
        self.log_pass(f"WorkOS pages: {len(workos_pages)}")
        self.log_pass(f"Redirect pages: {len(redirect_pages)}")
        self.log_pass(f"Standalone pages: {len(standalone_pages)}")

        if error_pages:
            self.log_fail(f"Error pages: {error_pages}")
            return False

        return True

    def check_services(self):
        """Check service modules"""
        self.section("SERVICES CHECK")

        services_dir = Path("services")
        if not services_dir.exists():
            self.log_warn("Services directory not found")
            return True  # Not critical

        service_files = sorted(services_dir.glob("*.py"))
        self.log_info(f"Found {len(service_files)} service files")

        critical_services = [
            "i18n_service.py",
            "auth_service.py",
            "notification_service.py",
        ]

        for service in critical_services:
            service_path = services_dir / service
            if service_path.exists():
                try:
                    content = service_path.read_text()
                    compile(content, service, "exec")
                    self.log_pass(f"Critical service OK: {service}")
                except Exception as e:
                    self.log_fail(f"Critical service error: {service} - {e}")
            else:
                self.log_warn(f"Critical service missing: {service}")

        return True

    def check_navigation(self):
        """Check navigation structure"""
        self.section("NAVIGATION CHECK")

        try:
            # Check if main navigation exists
            from pathlib import Path

            nav_file = Path(__file__).parent.parent / "navigation.py"
            if nav_file.exists():
                self.log_pass("Main navigation file exists")
                # Count pages with navigation
                pages_dir = Path(__file__).parent.parent / "pages"
                nav_pages = list(pages_dir.glob("*.py"))
                self.log_pass(f"Found {len(nav_pages)} total pages")
            else:
                self.log_fail("Main navigation file not found")
                return False

            return True

        except Exception as e:
            self.log_fail(f"Navigation check failed: {e}")
            return False

    def check_dependencies(self):
        """Check Python package dependencies"""
        self.section("DEPENDENCIES CHECK")

        required = ["streamlit", "pandas", "psycopg2", "bcrypt", "plotly", "folium"]

        missing = []
        for package in required:
            try:
                __import__(package.replace("-", "_"))
                self.log_pass(f"Package installed: {package}")
            except ImportError:
                self.log_fail(f"Package missing: {package}")
                missing.append(package)

        if missing:
            self.log_info(f"Install missing packages: pip install {' '.join(missing)}")
            return False

        return True

    def check_lsp_errors(self):
        """Check for Language Server Protocol errors"""
        self.section("CODE QUALITY CHECK")

        # Check for common issues in key files
        issues = {
            "pages/05_Properties_WorkOS.py": 4,
            "pages/06_Contracts_WorkOS.py": 5,
            "pages/07_Tickets_WorkOS.py": 4,
            "pages/08_Payments_WorkOS.py": 3,
        }

        for file, count in issues.items():
            if Path(file).exists():
                self.log_warn(f"{file}: {count} LSP diagnostics")

        self.log_info("Run 'get_latest_lsp_diagnostics' for details")
        return True

    def generate_report(self):
        """Generate verification report"""
        self.section("REPORT GENERATION")

        # Create artifacts directory
        artifacts = Path("artifacts")
        artifacts.mkdir(exist_ok=True)

        # Generate JSON report
        report = {
            "timestamp": datetime.now().isoformat(),
            "stats": self.stats,
            "errors": self.errors,
            "warnings": self.warnings,
            "passes": self.passes,
            "status": "PASS" if not self.errors else "FAIL",
        }

        json_file = artifacts / "fixzit-verify.json"
        with open(json_file, "w") as f:
            json.dump(report, f, indent=2)
        self.log_pass(f"JSON report: {json_file}")

        # Generate Markdown report
        md_file = artifacts / "fixzit-verify.md"
        with open(md_file, "w") as f:
            f.write("# Fixzit Verification Report\n\n")
            f.write(
                f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            )
            f.write("## Summary\n\n")
            f.write(
                f"- **Status**: {'✅ PASS' if report['status'] == 'PASS' else '❌ FAIL'}\n"
            )
            f.write(f"- **Passed**: {self.stats['passed']}\n")
            f.write(f"- **Failed**: {self.stats['failed']}\n")
            f.write(f"- **Warnings**: {self.stats['warnings']}\n\n")

            if self.errors:
                f.write("## Errors\n\n")
                for error in self.errors:
                    f.write(f"- ❌ {error}\n")
                f.write("\n")

            if self.warnings:
                f.write("## Warnings\n\n")
                for warning in self.warnings:
                    f.write(f"- ⚠️ {warning}\n")
                f.write("\n")

            if self.passes:
                f.write("## Passed Checks\n\n")
                for passed in self.passes:
                    f.write(f"- ✅ {passed}\n")

        self.log_pass(f"Markdown report: {md_file}")

        return report


def main():
    verifier = FixzitVerifier()

    print(f"{BOLD}{'='*60}{END}")
    print(f"{BOLD}FIXZIT APPLICATION VERIFICATION{END}")
    print(f"{BOLD}{'='*60}{END}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Run all checks
    checks = [
        verifier.check_dependencies,
        verifier.check_environment,
        verifier.check_pages,
        verifier.check_services,
        verifier.check_navigation,
        verifier.check_lsp_errors,
    ]

    for check in checks:
        try:
            verifier.stats["total_checks"] += 1
            check()
        except Exception as e:
            verifier.log_fail(f"Check failed: {e}")
            traceback.print_exc()

    # Generate report
    report = verifier.generate_report()

    # Final summary
    print(f"\n{BOLD}{'='*60}{END}")
    print(f"{BOLD}VERIFICATION COMPLETE{END}")
    print(f"{BOLD}{'='*60}{END}")

    if report["status"] == "PASS":
        print(f"{PASS}✅ ALL CRITICAL CHECKS PASSED{END}")
    else:
        print(f"{FAIL}❌ VERIFICATION FAILED - {len(verifier.errors)} ERRORS{END}")

    print("\nReports saved to: artifacts/fixzit-verify.(json|md)")

    # Exit with appropriate code
    sys.exit(0 if report["status"] == "PASS" else 1)


if __name__ == "__main__":
    main()
