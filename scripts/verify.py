# scripts/verify.py
from __future__ import annotations
import sys
import subprocess
from pathlib import Path
import typer
from rich import print
from rich.panel import Panel

app = typer.Typer(add_help_option=True)
ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)


def run(cmd, check=True, capture=False):
    if isinstance(cmd, str):
        proc = subprocess.run(cmd, shell=True, capture_output=capture, text=True)
    else:
        proc = subprocess.run(cmd, capture_output=capture, text=True)
    if capture:
        return proc.returncode, (proc.stdout or ""), (proc.stderr or "")
    if check and proc.returncode != 0:
        raise SystemExit(proc.returncode)
    return proc.returncode


@app.command()
def all(max_passes: int = typer.Option(3, help="Max verification passes")):
    """Run style, lint, typecheck, tests, deps, routes, DB, and UI review. Auto-fix where safe."""
    passes = 0
    while passes < max_passes:
        passes += 1
        print(
            Panel.fit(
                f"[bold]Fixzit Verify (Streamlit/Python) — Pass {passes}/{max_passes}[/]"
            )
        )

        # 1) Style & lint (auto-fix)
        print("\n[bold]Formatting (Black)[/]")
        run([sys.executable, "-m", "black", "."], check=False)

        print("\n[bold]Lint (Ruff)[/]")
        run([sys.executable, "-m", "ruff", "check", ".", "--fix"], check=False)

        # 2) Type checking (mypy)
        print("\n[bold]Type check (mypy)[/]")
        rc = run(
            [sys.executable, "-m", "mypy", "--ignore-missing-imports", "."], check=False
        )
        if rc != 0:
            print("[red]mypy errors — please review output above.")
            raise SystemExit(rc)

        # 3) Tests (pytest) if present
        has_tests = (ROOT / "tests").exists()
        if has_tests:
            print("\n[bold]Tests (pytest)[/]")
            rc = run([sys.executable, "-m", "pytest", "-q"], check=False)
            if rc != 0:
                print("[red]Tests failing — stopping here.")
                raise SystemExit(rc)
        else:
            print("\n[dim]No tests folder; skipping pytest.[/]")

        # 4) Dependency & security health (non-blocking warnings)
        print("\n[bold]Dependency health[/]")
        # pip check
        rc, out, err = run(
            [sys.executable, "-m", "pip", "check"], check=False, capture=True
        )
        (ART / "pip-check.txt").write_text(out + err)
        if rc != 0:
            print("[yellow]pip check reported issues → artifacts/pip-check.txt")
        # pip-audit
        rc = run(
            [
                sys.executable,
                "-m",
                "pip_audit",
                "-f",
                "json",
                "-o",
                str(ART / "pip-audit.json"),
            ],
            check=False,
        )
        if rc != 0:
            print(
                "[yellow]pip-audit found advisories → artifacts/pip-audit.json (warning)"
            )
        # bandit
        rc = run(
            [
                sys.executable,
                "-m",
                "bandit",
                "-q",
                "-r",
                ".",
                "-f",
                "json",
                "-o",
                str(ART / "bandit.json"),
            ],
            check=False,
        )
        if rc != 0:
            print("[yellow]Bandit flagged items → artifacts/bandit.json (warning)")

        # 5) Duplicate/structure checks
        print("\n[bold]Duplicate/file structure checks[/]")
        rc = run([sys.executable, str(SCRIPTS / "dup_check.py")], check=False)
        if rc != 0:
            print("[red]Duplicate issues found. See artifacts/dup-report.md")
            raise SystemExit(rc)

        # 6) Routes/pages
        print("\n[bold]Route/page checks[/]")
        rc = run([sys.executable, str(SCRIPTS / "routes_check.py")], check=False)
        if rc != 0:
            print("[red]Route/page check failed. See artifacts/routes-report.md")
            raise SystemExit(rc)

        # 7) Database integrity (PostgreSQL)
        print("\n[bold]Database integrity (PostgreSQL)[/]")
        rc = run([sys.executable, str(SCRIPTS / "db_check.py")], check=False)
        if rc != 0:
            print("[red]Database check failed. See artifacts/db-report.md")
            raise SystemExit(rc)

        # 8) UI review (launch streamlit + crawl pages)
        print("\n[bold]UI review (headless) — screenshots + issue logs[/]")
        rc = run([sys.executable, str(SCRIPTS / "ui_review.py")], check=False)
        if rc != 0:
            print("[yellow]UI review found blocking issues. See artifacts/ui-report.md")
            if passes < max_passes:
                continue
            else:
                raise SystemExit(rc)

        print("\n[bold green]✅ All checks passed — no open errors.[/]")
        return

    raise SystemExit(1)


@app.command()
def quick():
    """Fast local sanity check (format+lint+routes)."""
    run([sys.executable, "-m", "black", "."], check=False)
    run([sys.executable, "-m", "ruff", "check", ".", "--fix"], check=False)
    run([sys.executable, str(SCRIPTS / "routes_check.py")])
    print("[green]Quick check OK")


if __name__ == "__main__":
    app()
