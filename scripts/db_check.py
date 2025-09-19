# scripts/db_check.py
from __future__ import annotations
import os
import sys
import json
from pathlib import Path

import psycopg2
from psycopg2.extras import DictCursor

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)

DATABASE_URL = os.environ.get("DATABASE_URL")

issues = []
meta = {}

if not DATABASE_URL:
    (ART / "db-report.md").write_text(
        "DATABASE_URL not set — skipping PostgreSQL checks.", encoding="utf-8"
    )
    print("[db] No DATABASE_URL — skip")
    sys.exit(0)

try:
    con = psycopg2.connect(DATABASE_URL)
    con.autocommit = True
except Exception as e:
    issues.append({"type": "connect", "message": f"Connection failed: {e}"})
    (ART / "db-report.json").write_text(
        json.dumps({"issues": issues}, indent=2), encoding="utf-8"
    )
    (ART / "db-report.md").write_text(
        "\n".join(["# DB Integrity Report", f"❌ {issues[0]['message']}"]),
        encoding="utf-8",
    )
    sys.exit(1)

with con.cursor(cursor_factory=DictCursor) as cur:
    # Version
    cur.execute("select version();")
    version_result = cur.fetchone()
    meta["version"] = version_result[0] if version_result else "Unknown"

    # NOT VALID constraints
    cur.execute(
        """
        SELECT conrelid::regclass AS table, conname AS name, contype, convalidated
        FROM pg_constraint
        WHERE convalidated = false
        """
    )
    not_valid = cur.fetchall()
    for row in not_valid:
        issues.append(
            {
                "type": "constraint:not_valid",
                "message": f"NOT VALID constraint {row['name']} on {row['table']} (type {row['contype']})",
            }
        )

    # Tables without primary key
    cur.execute(
        """
        SELECT c.relname AS table
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog','information_schema')
          AND NOT EXISTS (
              SELECT 1 FROM pg_index i
              WHERE i.indrelid = c.oid AND i.indisprimary
          );
        """
    )
    no_pk = cur.fetchall()
    for row in no_pk:
        issues.append(
            {
                "type": "table:no_primary_key",
                "message": f"Table {row['table']} has no primary key",
            }
        )

    # FKs without index on referencing columns (performance risk)
    cur.execute(
        """
        SELECT conrelid::regclass AS table, conname AS fk_name, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE contype = 'f'
          AND NOT EXISTS (
            SELECT 1 FROM pg_index i
            WHERE i.indrelid = conrelid
              AND (i.indkey::smallint[] @> conkey::smallint[])
          );
        """
    )
    fk_no_index = cur.fetchall()
    for row in fk_no_index:
        issues.append(
            {
                "type": "fk:no_index",
                "message": f"FK {row['fk_name']} on {row['table']} has no supporting index",
                "extra": row["definition"],
            }
        )

con.close()

report = {"db": "postgresql", "meta": meta, "issues": issues}
(ART / "db-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

lines = [
    "# DB Integrity Report",
    "Engine: PostgreSQL",
    f"Version: {meta.get('version','?')}",
    "",
]
if not issues:
    lines.append("✅ DB checks OK")
else:
    lines.append(f"❌ Issues: {len(issues)}")
    for it in issues:
        msg = f"- **{it['type']}**: {it['message']}"
        if it.get("extra"):
            msg += f"\n  - {it['extra']}"
        lines.append(msg)
(ART / "db-report.md").write_text("\n".join(lines), encoding="utf-8")

sys.exit(1 if issues else 0)
