---
name: DB + Mongoose 8.x
description: Reduce false positives around Mongoose types/lean/indexes.
applyTo: "src/models/**,src/db/**,src/lib/**mongo**,src/lib/**db**,src/app/api/**"
---

- Mongoose 8.x: prefer clean types (central augmentation/helpers) over scattered type-casts.
- lean(): use only for read paths that do NOT require document methods/hooks/virtuals; do not recommend "lean everywhere".
- Indexing: org_id must be indexed for common query shapes; propose compound indexes only when justified by the query filter/sort.
- Performance claims must point to a specific query pattern plus an index/schema gap visible in repo.
