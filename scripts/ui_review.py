# scripts/ui_review.py
from __future__ import annotations
import os
import sys
import time
import json
import re
import signal
import subprocess
from pathlib import Path
from typing import List, Dict, Any
import requests

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
SHOT = ART / "screenshots"
ART.mkdir(exist_ok=True)
SHOT.mkdir(exist_ok=True)

ENTRY_CAND = ["app.py", "streamlit_app.py", "main.py"]
PAGES_DIR = ROOT / "pages"
PORT = int(os.environ.get("FIXZIT_PORT", "8501"))
BASE = f"http://127.0.0.1:{PORT}"


def find_entry() -> Path:
    for n in ENTRY_CAND:
        p = ROOT / n
        if p.exists():
            return p
    print("[ui] No entry app file found (app.py/streamlit_app.py/main.py)")
    sys.exit(1)


def discover_pages() -> List[str]:
    names: List[str] = ["Home"]
    if PAGES_DIR.exists():
        for f in sorted(PAGES_DIR.glob("*.py")):
            name = f.stem.replace("_", " ").strip() or f.stem
            names.append(name)
    # unique preserve order
    seen, uniq = set(), []
    for n in names:
        k = re.sub(r"\s+", " ", n).strip().lower()
        if k not in seen:
            seen.add(k)
            uniq.append(n)
    return uniq


def wait_server(url: str, timeout: float = 30.0) -> None:
    start = time.time()
    last_err = None
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=2)
            if r.status_code in (200, 404):
                return
        except Exception as e:
            last_err = e
        time.sleep(0.5)
    raise RuntimeError(f"Dev server not responding at {url}: {last_err}")


def launch_server(entry: Path) -> subprocess.Popen:
    cmd = [
        sys.executable,
        "-m",
        "streamlit",
        "run",
        str(entry),
        "--server.headless",
        "true",
        "--server.port",
        str(PORT),
        "--browser.gatherUsageStats",
        "false",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    wait_server(BASE)
    return proc


def playwright_review(routes: List[str]) -> Dict[str, Any]:
    from playwright.sync_api import sync_playwright

    issues: List[Dict[str, Any]] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context()
        for route in routes:
            page = context.new_page()
            console_errors: List[str] = []
            failed: List[Dict[str, Any]] = []

            page.on(
                "console",
                lambda msg: (
                    console_errors.append(msg.text) if msg.type() == "error" else None
                ),
            )
            page.on(
                "response",
                lambda res: (
                    failed.append({"url": res.url, "status": res.status})
                    if res.status >= 400
                    else None
                ),
            )
            url = BASE
            try:
                # Home first
                if route == "Home":
                    page.goto(url, wait_until="networkidle", timeout=25000)
                else:
                    # Try clicking via sidebar label
                    page.goto(url, wait_until="domcontentloaded", timeout=25000)
                    try:
                        page.get_by_text(route, exact=True).first.click(timeout=4000)
                        page.wait_for_load_state("networkidle", timeout=20000)
                    except Exception:
                        from urllib.parse import quote

                        page.goto(
                            f"{url}/?page={quote(route)}",
                            wait_until="networkidle",
                            timeout=25000,
                        )

                # Screenshot
                safe = "root" if route == "Home" else re.sub(r"[^\w\-]+", "_", route)
                page.screenshot(path=str(SHOT / f"{safe}.png"), full_page=True)

                # Log issues
                for m in console_errors:
                    issues.append({"route": route, "type": "console", "message": m})
                for f in failed:
                    issues.append(
                        {
                            "route": route,
                            "type": "http",
                            "message": f"HTTP {f['status']}",
                            "extra": {"url": f["url"]},
                        }
                    )
            except Exception as e:
                issues.append({"route": route, "type": "pageerror", "message": str(e)})
            finally:
                page.close()
        context.close()
        browser.close()
    return {"issues": issues, "routes": routes}


def write_reports(result: Dict[str, Any]) -> None:
    (ART / "ui-report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    lines = ["# UI Review Report", "", f"Routes checked: {len(result['routes'])}", ""]
    issues = result["issues"]
    if not issues:
        lines.append("✅ No UI issues found.")
    else:
        lines.append(f"❌ Issues: {len(issues)}\n")
        by_route: Dict[str, List[Dict[str, Any]]] = {}
        for it in issues:
            by_route.setdefault(it["route"], []).append(it)
        for route, arr in by_route.items():
            lines.append(f"## {route}")
            for i in arr:
                lines.append(f"- **{i['type']}**: {i['message']}")
                if i.get("extra", {}).get("url"):
                    lines.append(f"  - URL: {i['extra']['url']}")
            lines.append("")
    (ART / "ui-report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    entry = find_entry()
    routes = discover_pages()
    proc = launch_server(entry)
    try:
        result = playwright_review(routes)
        write_reports(result)
        blocking = [i for i in result["issues"] if i["type"] != "a11y"]
        if blocking:
            sys.exit(1)
        print("UI review OK → artifacts/ui-report.md")
    finally:
        try:
            if proc.poll() is None:
                if os.name == "nt":
                    proc.terminate()
                else:
                    os.kill(proc.pid, signal.SIGTERM)
        except Exception:
            pass


if __name__ == "__main__":
    main()
