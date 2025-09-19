# scripts/routes_check.py
from __future__ import annotations
from pathlib import Path
import re
import sys
import json

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
PAGES = ROOT / "pages"
ENTRY_CAND = [ROOT / "app.py", ROOT / "streamlit_app.py", ROOT / "main.py"]

issues = []
entry = next((p for p in ENTRY_CAND if p.exists()), None)
if entry is None:
    issues.append(
        {
            "type": "entry:missing",
            "message": "No entry file (app.py/streamlit_app.py/main.py)",
        }
    )

names = []
if PAGES.exists():
    for f in sorted(PAGES.glob("*.py")):
        names.append(f.stem.replace("_", " ").strip() or f.stem)

# Duplicates (case/space insensitive)
keyed = [re.sub(r"\s+", " ", n).strip().lower() for n in names]
seen = {}
dupes = []
for i, k in enumerate(keyed):
    if k in seen:
        dupes.append((names[i], names[seen[k]]))
    else:
        seen[k] = i

if dupes:
    issues.append(
        {"type": "pages:duplicate", "message": "Duplicate page labels", "extra": dupes}
    )

report = {"entry": str(entry) if entry else None, "pages": names, "issues": issues}
(ART / "routes-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

lines = ["# Routes/Pages Report", ""]
lines.append(f"Entry: {entry if entry else '— MISSING —'}")
lines.append(f"Pages ({len(names)}): " + ", ".join(names) if names else "(none)")
lines.append("")
if not issues:
    lines.append("✅ Routes/pages OK")
else:
    lines.append(f"❌ Issues: {len(issues)}")
    for it in issues:
        lines.append(f"- **{it['type']}**: {it['message']}")
        if it.get("extra"):
            for a, b in it["extra"]:
                lines.append(f"  - {a} ↔ {b}")
(ART / "routes-report.md").write_text("\n".join(lines), encoding="utf-8")

sys.exit(1 if issues else 0)
