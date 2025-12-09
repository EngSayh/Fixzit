# AI Memory Backups

This directory contains automatic backups of the master-index.json file.

Backups are created before each merge operation.
Only the last 10 backups are retained.

## Recovery

To restore from a backup:

```bash
cp ai-memory/backups/master-index-TIMESTAMP.json ai-memory/master-index.json
```
