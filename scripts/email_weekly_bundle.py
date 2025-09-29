#!/usr/bin/env python3
"""
Email Weekly Bundle - Send per-tenant reports via email
"""

import argparse
import datetime
import os
import pathlib
import sys

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from scripts.lib.notify import NotifyConfig, latest_report_paths, send_email
from scripts.weekly_report import main as generate_reports

# Import tenant utilities with fallback
try:
    from app.tenant import current_tenant, list_tenants
except ImportError:

    def current_tenant():
        return os.getenv("FXZ_TENANT", "default")

    def list_tenants():
        return [current_tenant()]


ARTIFACTS = pathlib.Path(__file__).resolve().parents[1] / "artifacts"


def ensure_bundle(tenant: str, do_zip: bool) -> dict:
    """Ensure reports exist for tenant, regenerating if needed"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")

    if do_zip:
        # Generate all tenants with ZIP bundle
        generate_reports(args=argparse.Namespace(tenant=None, all=True, zip=True))
    else:
        # Generate single tenant
        generate_reports(args=argparse.Namespace(tenant=tenant, all=False, zip=False))

    return {"paths": latest_report_paths(tenant), "timestamp": timestamp}


def email_tenant(tenant: str, dry_run: bool = False, force_zip: bool = True) -> str:
    """Send email report for a specific tenant"""
    config = NotifyConfig(tenant)

    if not config.emails:
        return f"[{tenant}] skipped: no recipient emails configured"

    # Ensure reports exist
    bundle_info = ensure_bundle(tenant, do_zip=force_zip)
    paths = bundle_info["paths"]

    # Prepare email content
    subject = f"{config.subject_prefix} {tenant} — Weekly Report"
    body = f"""Tenant: {tenant}
Generated: {datetime.datetime.now().isoformat()}
Host: {os.getenv('HOSTNAME', 'unknown')}

Attachments:
- HTML Report: {paths['html'].name if paths['html'] else 'Not available'}
- ZIP Bundle: {paths['zip'].name if paths['zip'] else 'Not available'}

This is an automated weekly performance and reliability report for your Fixzit deployment.
"""

    # Prepare attachments
    attachments = []
    if config.attach_html and paths["html"]:
        attachments.append(paths["html"])
    if config.attach_zip and paths["zip"]:
        attachments.append(paths["zip"])

    if dry_run:
        attachment_names = [p.name for p in attachments]
        return (
            f"[DRY-RUN] {tenant} -> {config.emails} | attachments: {attachment_names}"
        )

    # Send email
    try:
        send_email(
            subject=subject,
            body_text=body,
            to=config.emails,
            cc=config.cc,
            bcc=config.bcc,
            attachments=attachments,
        )
        return f"[{tenant}] emailed to {len(config.emails)} recipient(s)"

    except Exception as e:
        return f"[{tenant}] email failed: {e}"


def cli():
    """Command line interface"""
    parser = argparse.ArgumentParser(description="Email weekly report bundles")
    parser.add_argument("--tenant", default=os.getenv("FXZ_TENANT"))
    parser.add_argument("--all", action="store_true", help="Email all tenants")
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would be sent"
    )
    parser.add_argument("--no-zip", action="store_true", help="Don't create ZIP bundle")

    args = parser.parse_args()

    # Determine tenants to process
    if args.all or not args.tenant:
        tenants = list_tenants()
    else:
        tenants = [args.tenant]

    # Process each tenant
    results = []
    for tenant in tenants:
        result = email_tenant(tenant, dry_run=args.dry_run, force_zip=not args.no_zip)
        results.append(result)

    # Print results
    for result in results:
        print(result)


if __name__ == "__main__":
    cli()
