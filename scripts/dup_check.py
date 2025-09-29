# scripts/dup_check.py
from __future__ import annotations
from pathlib import Path
import ast
import sys
import json

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)

pyfiles = [
    p
    for p in ROOT.rglob("*.py")
    if ".venv" not in p.parts
    and "venv" not in p.parts
    and "artifacts" not in p.parts
    and "__pycache__" not in p.parts
    and "site-packages" not in p.parts
    and p.name != "dup_check.py"
]

# Basename duplicates
by_base = {}
for f in pyfiles:
    by_base.setdefault(f.name.lower(), []).append(str(f.relative_to(ROOT)))
base_dupes = {k: v for k, v in by_base.items() if len(v) > 1}

# Top-level defs duplicates (best-effort warning)
defs = {}
for f in pyfiles:
    try:
        mod = ast.parse(f.read_text(encoding="utf-8"))
        for node in mod.body:
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                name = node.name
                defs.setdefault(name, []).append(str(f.relative_to(ROOT)))
    except Exception:
        pass

def_dupes = {k: v for k, v in defs.items() if len(v) > 1}

issues = []
if base_dupes:
    issues.append(
        {
            "type": "file:duplicate",
            "message": "Duplicate basenames",
            "extra": base_dupes,
        }
    )
if def_dupes:
    issues.append(
        {
            "type": "defs:duplicate",
            "message": "Duplicate top-level defs (review for consolidation)",
            "extra": {k: v[:5] for k, v in def_dupes.items()},
        }
    )

(ART / "dup-report.json").write_text(
    json.dumps({"issues": issues}, indent=2), encoding="utf-8"
)
lines = ["# Duplicate Report", ""]
if not issues:
    lines.append("✅ No duplicates detected")
else:
    lines.append(f"❌ Issues: {len(issues)}")
    for it in issues:
        lines.append(f"- **{it['type']}**: {it['message']}")
        if it.get("extra"):
            if isinstance(it["extra"], dict):
                for k, arr in list(it["extra"].items())[:20]:
                    lines.append(f"  - {k}: {arr if isinstance(arr, list) else arr}")
(ART / "dup-report.md").write_text("\n".join(lines), encoding="utf-8")

sys.exit(1 if base_dupes else 0)
