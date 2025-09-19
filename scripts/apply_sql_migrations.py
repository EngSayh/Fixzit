import os
import glob
import psycopg2
import psycopg2.extras

dsn = os.environ.get("DATABASE_URL", "")
if not dsn:
    print("DATABASE_URL not set")
    exit(1)

conn = psycopg2.connect(dsn)
conn.autocommit = True
cur = conn.cursor()

# Create migrations tracking table
cur.execute(
    """
CREATE TABLE IF NOT EXISTS schema_migrations(
  filename TEXT PRIMARY KEY, 
  applied_at TIMESTAMPTZ DEFAULT now()
);
"""
)

# Apply migrations in order
for path in sorted(glob.glob("db/migrations/*.sql")):
    cur.execute("SELECT 1 FROM schema_migrations WHERE filename=%s", (path,))
    if cur.fetchone():
        print(f"Skipping {path} (already applied)")
        continue

    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()

    print(f"Applying {path}")
    try:
        cur.execute(sql)
        cur.execute("INSERT INTO schema_migrations(filename) VALUES(%s)", (path,))
        print(f"✓ Applied {path}")
    except Exception as e:
        print(f"✗ Failed to apply {path}: {e}")
        conn.rollback()

print("Migrations complete.")
cur.close()
conn.close()
