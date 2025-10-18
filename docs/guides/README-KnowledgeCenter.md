# Knowledge Center / AI Help

## Endpoints

- GET `/api/help/articles` — list published, tenant-scoped articles. Query: `q`, `category`, `page`, `limit`. Returns `{ items, page, limit, total, hasMore }`.
- PATCH `/api/help/articles/[id]` — SUPER_ADMIN; updates article by id or slug; triggers KB ingest.
- POST `/api/help/ask` — Auth required; body `{ question, limit?, category?, lang?, route? }`. Uses vector → text → regex; returns `{ answer, citations }`.
- POST `/api/kb/search` — Auth; body `{ query: number[], q?: string, lang?, role?, route?, limit? }` returns `{ results }`.
- POST `/api/kb/ingest` — SUPER_ADMIN/ADMIN; body `{ articleId, content, lang?, roleScopes?, route? }` upserts chunks.
- DELETE `/api/kb/ingest?articleId=...` — SUPER_ADMIN/ADMIN; deletes chunks for article.
- POST `/api/files/resumes/presign` — SUPER_ADMIN/ADMIN/HR; body `{ fileName, contentType }` returns `{ url, key }` for S3 PUT.
- GET `/api/files/resumes/[file]?token=...&exp=...` — SUPER_ADMIN/ADMIN/HR; verifies token+expiry and redirects to S3 signed GET or streams local.

## Behavior

- Article edits trigger ingestion via API; optional change-stream watcher auto-syncs embeddings.
- Ask endpoint redacts PII and truncates context before OpenAI call.
- Markdown is sanitized (remark/rehype + rehype-sanitize).

## Security

- Tenant isolation on all Help/KB queries; RBAC enforced.
- Signed URLs with expiry for resumes; non-public storage; optional S3 backend.

## Setup

- Run `node scripts/add-database-indexes.js`.
- Optional: `npm run kb:watch` to keep embeddings in sync.
- Env: `MONGODB_URI`, `OPENAI_API_KEY`, `KB_EMBEDDING_MODEL`, `AWS_S3_BUCKET`, `AWS_REGION`, `FILE_SIGNING_SECRET`.
