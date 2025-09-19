"""
Notification utilities for email and Slack delivery of reports
"""

import json
import mimetypes
import os
import pathlib
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from typing import Dict, List, Optional

# Configuration
ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCALDATA = ROOT / ".localdata"
ARTIFACTS = ROOT / "artifacts"


class NotifyConfig:
    """Per-tenant notification configuration"""

    def __init__(self, tenant: str):
        self.tenant = tenant
        self.cfg = self._load()

    def _load(self) -> Dict:
        """Load notification config with fallback hierarchy"""
        paths = [
            LOCALDATA / self.tenant / "notify.json",
            LOCALDATA / "_default" / "notify.json",
        ]

        for path in paths:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception as e:
                    print(f"Warning: Could not load {path}: {e}")

        # Default configuration
        return {
            "emails": [],
            "cc": [],
            "bcc": [],
            "subject_prefix": "[Fixzit]",
            "attach_zip": True,
            "attach_html": True,
        }

    @property
    def emails(self) -> List[str]:
        """Primary recipient email addresses"""
        return self.cfg.get("emails", [])

    @property
    def cc(self) -> List[str]:
        """CC recipient email addresses"""
        return self.cfg.get("cc", [])

    @property
    def bcc(self) -> List[str]:
        """BCC recipient email addresses"""
        return self.cfg.get("bcc", [])

    @property
    def subject_prefix(self) -> str:
        """Email subject prefix"""
        return self.cfg.get("subject_prefix", "[Fixzit]")

    @property
    def slack_webhook(self) -> Optional[str]:
        """Slack webhook URL (tenant-specific or global fallback)"""
        return self.cfg.get("slack_webhook") or os.getenv("SLACK_WEBHOOK_URL")

    @property
    def slack_channel_override(self) -> Optional[str]:
        """Override Slack channel for this tenant"""
        return self.cfg.get("slack_channel_override")

    @property
    def attach_html(self) -> bool:
        """Whether to attach HTML report to emails"""
        return bool(self.cfg.get("attach_html", True))

    @property
    def attach_zip(self) -> bool:
        """Whether to attach ZIP bundle to emails"""
        return bool(self.cfg.get("attach_zip", True))


def latest_report_paths(tenant: str) -> Dict[str, Optional[pathlib.Path]]:
    """Find the latest HTML and ZIP reports for a tenant"""
    html = None
    zipf = None

    if ARTIFACTS.exists():
        # Find latest HTML report for this tenant
        html_candidates = sorted(
            ARTIFACTS.glob(f"weekly-report-{tenant}.html"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if html_candidates:
            html = html_candidates[0]

        # Find latest ZIP bundle (contains all tenants)
        zip_candidates = sorted(
            ARTIFACTS.glob("weekly-reports-*.zip"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if zip_candidates:
            zipf = zip_candidates[0]

    return {"html": html, "zip": zipf}


def _smtp_client():
    """Create authenticated SMTP client"""
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")

    if not all([host, user, password]):
        raise RuntimeError(
            "SMTP configuration incomplete. Need SMTP_HOST, SMTP_USER, SMTP_PASS"
        )

    # Type checking for None values
    smtp_host = host or "localhost"
    smtp_user = user or ""
    smtp_password = password or ""

    client = smtplib.SMTP(smtp_host, port, timeout=30)
    client.ehlo()
    client.starttls()
    client.login(smtp_user, smtp_password)

    return client


def send_email(
    subject: str,
    body_text: str,
    to: List[str],
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[pathlib.Path]] = None,
) -> None:
    """Send email with optional attachments"""
    if not to:
        raise ValueError("No recipients specified")

    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER"))
    msg["To"] = ", ".join(to)

    if cc:
        msg["Cc"] = ", ".join(cc)

    all_recipients = to + (cc or []) + (bcc or [])
    msg["Subject"] = subject
    msg.set_content(body_text)

    # Add attachments
    for attachment_path in attachments or []:
        if not attachment_path or not attachment_path.exists():
            continue

        ctype, encoding = mimetypes.guess_type(str(attachment_path))
        if ctype is None or encoding is not None:
            ctype = "application/octet-stream"

        maintype, subtype = ctype.split("/", 1)

        with open(attachment_path, "rb") as fp:
            msg.add_attachment(
                fp.read(),
                maintype=maintype,
                subtype=subtype,
                filename=attachment_path.name,
            )

    # Send email
    with _smtp_client() as smtp:
        smtp.send_message(msg, to_addrs=all_recipients)


def post_slack(webhook_url: str, payload: Dict) -> None:
    """Post message to Slack webhook"""
    if not webhook_url:
        raise ValueError("No Slack webhook URL provided")

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        webhook_url, data=data, headers={"Content-Type": "application/json"}
    )

    context = ssl.create_default_context()

    with urllib.request.urlopen(request, context=context, timeout=20) as response:
        response.read()  # Consume response
