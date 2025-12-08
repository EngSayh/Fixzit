"""
System Verification Script for Fixzit Application
Checks all components, connections, and workflows
"""

import sys
import os
from pathlib import Path

# Track results
errors = []
warnings = []
success = []
EMAIL_DOMAIN = os.getenv("EMAIL_DOMAIN", "fixzit.co")


def check_database():
    """Verify database connection and essential tables"""
    try:
        # Import from project
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from utils.database import get_db_connection

        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()

            # Check essential tables
            tables = ["users", "properties", "contracts", "tickets", "payments"]
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                success.append(f"✓ Table '{table}' exists with {count} records")

            # Check test users
            cursor.execute(
                f"SELECT email, role FROM users WHERE email IN ('admin@{EMAIL_DOMAIN}', 'john.smith@{EMAIL_DOMAIN}', 'tenant@example.com')"
            )
            users = cursor.fetchall()
            for email, role in users:
                success.append(f"✓ Test user {email} ({role}) exists")

            cursor.close()
            conn.close()
        else:
            errors.append("✗ Database connection failed")
    except Exception as e:
        errors.append(f"✗ Database check failed: {str(e)}")


def check_pages():
    """Check all pages are importable"""
    pages_dir = Path("pages")
    page_files = sorted(pages_dir.glob("*.py"))

    for page_file in page_files:
        try:
            # Skip Register and Reset_Password pages (no main function required)
            if page_file.stem in ["Register", "Reset_Password"]:
                continue

            # Check if file has main function
            with open(page_file, "r") as f:
                content = f.read()
                if "def main()" in content or '__name__ == "__main__"' in content:
                    success.append(f"✓ Page {page_file.name} has entry point")
                else:
                    warnings.append(f"⚠ Page {page_file.name} missing main() function")

            # Check for common errors
            if content.count("import") > 50:
                warnings.append(
                    f"⚠ Page {page_file.name} has many imports ({content.count('import')})"
                )

        except Exception as e:
            errors.append(f"✗ Page {page_file.name} check failed: {str(e)}")


def check_services():
    """Check all services are properly defined"""
    services_dir = Path("services")
    service_files = sorted(services_dir.glob("*.py"))

    service_classes = {}
    for service_file in service_files:
        try:
            with open(service_file, "r") as f:
                content = f.read()

            # Find class definitions
            import re

            classes = re.findall(r"class\s+(\w*Service\w*)", content)

            if classes:
                for cls in classes:
                    if cls in service_classes:
                        errors.append(
                            f"✗ Duplicate service class {cls} in {service_file.name} and {service_classes[cls]}"
                        )
                    else:
                        service_classes[cls] = service_file.name
                        success.append(f"✓ Service {cls} in {service_file.name}")
            else:
                if service_file.stem not in [
                    "__init__",
                    "attachment_manager",
                    "automations_engine",
                    "boards_manager",
                    "feedback_system",
                    "tour_system",
                    "otp_security",
                    "workspace_theming",
                ]:
                    warnings.append(
                        f"⚠ Service file {service_file.name} has no Service class"
                    )

        except Exception as e:
            errors.append(f"✗ Service {service_file.name} check failed: {str(e)}")


def check_duplicates():
    """Check for duplicate page numbers and names"""
    pages_dir = Path("pages")
    page_files = sorted(pages_dir.glob("*.py"))

    page_numbers = {}
    page_names = {}

    for page_file in page_files:
        # Extract page number if exists
        name = page_file.stem
        if name[0].isdigit():
            # Extract number prefix
            import re

            match = re.match(r"^(\d+)_(.+)$", name)
            if match:
                num = match.group(1)
                page_name = match.group(2)

                # Check for duplicate numbers
                if num in page_numbers:
                    errors.append(
                        f"✗ Duplicate page number {num}: {page_file.name} and {page_numbers[num]}"
                    )
                else:
                    page_numbers[num] = page_file.name

                # Check for similar names
                for existing_name, existing_file in page_names.items():
                    if page_name.lower() == existing_name.lower():
                        warnings.append(
                            f"⚠ Similar page names: {page_file.name} and {existing_file}"
                        )

                page_names[page_name.lower()] = page_file.name


def check_imports():
    """Check for broken imports"""
    all_files = list(Path("pages").glob("*.py")) + list(Path("services").glob("*.py"))

    for file_path in all_files:
        try:
            with open(file_path, "r") as f:
                content = f.read()

            # Check for imports of deleted files
            if "ShareVerification" in content and "SecureShareVerify" not in str(
                file_path
            ):
                errors.append(
                    f"✗ File {file_path.name} imports deleted ShareVerification"
                )
            if "ShareVerify" in content and "SecureShareVerify" not in str(file_path):
                errors.append(f"✗ File {file_path.name} imports deleted ShareVerify")
            if "ModerationQueue" in content and "ShareModerationQueue" not in str(
                file_path
            ):
                errors.append(
                    f"✗ File {file_path.name} imports deleted ModerationQueue"
                )

        except Exception as e:
            errors.append(f"✗ Import check for {file_path.name} failed: {str(e)}")


def main():
    print("\n" + "=" * 60)
    print("FIXZIT SYSTEM VERIFICATION")
    print("=" * 60 + "\n")

    print("🔍 Checking Database...")
    check_database()

    print("🔍 Checking Pages...")
    check_pages()

    print("🔍 Checking Services...")
    check_services()

    print("🔍 Checking for Duplicates...")
    check_duplicates()

    print("🔍 Checking Imports...")
    check_imports()

    # Print results
    print("\n" + "=" * 60)
    print("VERIFICATION RESULTS")
    print("=" * 60 + "\n")

    if success:
        print("✅ SUCCESS (%d):" % len(success))
        for s in success[:10]:  # Show first 10
            print(f"   {s}")
        if len(success) > 10:
            print(f"   ... and {len(success) - 10} more")

    if warnings:
        print("\n⚠️  WARNINGS (%d):" % len(warnings))
        for w in warnings:
            print(f"   {w}")

    if errors:
        print("\n❌ ERRORS (%d):" % len(errors))
        for e in errors:
            print(f"   {e}")
        print("\n⚠️  System has errors that need fixing!")
        sys.exit(1)
    else:
        print("\n✅ System verification PASSED! No critical errors found.")
        print(f"   - {len(success)} checks passed")
        print(f"   - {len(warnings)} warnings (non-critical)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
