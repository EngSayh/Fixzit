#!/usr/bin/env python3
"""
Slack Digest - Post weekly report summaries to Slack
"""

import argparse
import datetime
import os
import pathlib
import sys

# Add parent directory to path
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from scripts.lib.notify import NotifyConfig, latest_report_paths, post_slack

# Import tenant utilities with fallback
try:
    from app.tenant import current_tenant, list_tenants
except ImportError:

    def current_tenant():
        return os.getenv("FXZ_TENANT", "default")

    def list_tenants():
        return [current_tenant()]


def payload_for(tenant: str, config: NotifyConfig) -> dict:
    """Create Slack payload for tenant digest"""
    paths = latest_report_paths(tenant)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    text = f"*Fixzit Weekly — {tenant}*\nGenerated: {now}"

    blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]

    # Add file information blocks
    if paths["html"]:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"• HTML report: `{paths['html'].name}` (emailed as attachment)",
                },
            }
        )

    if paths["zip"]:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"• ZIP bundle: `{paths['zip'].name}` (contains all tenant reports)",
                },
            }
        )

    # Add status indicators
    blocks.append(
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"📊 Weekly performance and reliability summary for {tenant} has been generated and distributed.",
            },
        }
    )

    payload = {"blocks": blocks, "text": text}  # Fallback text for notifications

    # Add channel override if specified
    if config.slack_channel_override:
        payload["channel"] = config.slack_channel_override

    return payload


def post_digest(tenant: str) -> str:
    """Post Slack digest for a specific tenant"""
    config = NotifyConfig(tenant)

    if not config.slack_webhook:
        return f"[{tenant}] skipped: no Slack webhook configured"

    try:
        payload = payload_for(tenant, config)
        post_slack(config.slack_webhook, payload)
        return f"[{tenant}] Slack digest posted successfully"

    except Exception as e:
        return f"[{tenant}] Slack post failed: {e}"


def cli():
    """Command line interface"""
    parser = argparse.ArgumentParser(
        description="Post Slack digests for weekly reports"
    )
    parser.add_argument("--tenant", default=None, help="Post for specific tenant")
    parser.add_argument("--all", action="store_true", help="Post for all tenants")

    args = parser.parse_args()

    # Determine tenants to process
    if args.all or not args.tenant:
        tenants = list_tenants()
    else:
        tenants = [args.tenant]

    # Process each tenant
    results = []
    for tenant in tenants:
        result = post_digest(tenant)
        results.append(result)

    # Print results
    for result in results:
        print(result)


if __name__ == "__main__":
    cli()
