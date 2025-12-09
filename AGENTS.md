# AGENTS.md – Fixzit Coding Agents

You are an AI coding agent working on the Fixzit codebase.

## Setup

- Install dependencies: `pnpm install`
- Run dev server: `pnpm dev`
- Run tests: `pnpm test` (and any E2E scripts if defined)
- Type check: `pnpm typecheck`
- Lint: `pnpm lint`

## Project Context

- Multi-tenant facility management + marketplace platform.
- Core domains:
  - Facility Management / Work Orders
  - Real Estate / Aqar marketplace
  - Shared Services (Finance, HR, CRM, Admin, Support)
- Tech stack: Next.js (App Router), TypeScript, Node.js, MongoDB (Mongoose), Tailwind, shadcn/ui.

## Memory-Aware Workflow

This repo maintains an external "brain" at `ai-memory/master-index.json`.

When you are assigned a task such as:
- "Refactor the login/auth flow"
- "Add a new work order status end-to-end"
- "Clean up duplicated customer models"

You MUST:

1. **Read** `ai-memory/master-index.json`.
2. Use it to:
   - Find the relevant files and categories,
   - Understand high-level responsibilities and dependencies.
3. Only then open or fetch those specific files from the codebase for detailed work.
4. Work in small, verifiable steps:
   - Plan the change,
   - Apply edits,
   - Run tests where applicable,
   - Summarize what changed and why.

## File Categories

| Category   | Path Patterns                              | Purpose              |
|------------|--------------------------------------------|--------------------- |
| routes     | `app/api/**`, `**/route.ts`                | API endpoints        |
| models     | `server/models/**`, `**/schema.ts`         | Database schemas     |
| components | `components/**`, `app/**/*.tsx`            | React components     |
| utils      | `lib/**`, `utils/**`, `helpers/**`         | Utility functions    |
| core       | Everything else                            | Config, types, constants |

## Domain Boundaries (STRICT)

- **FM (Facility Management)**: `app/fm/**`, `domain/fm/**`
- **Marketplace/Souq**: `app/souq/**`, `app/marketplace/**`
- **Finance**: `app/finance/**`, `modules/finance/**`
- **HR**: `app/hr/**`, `modules/hr/**`
- **CRM**: `app/crm/**`, `modules/crm/**`
- **Aqar (Property)**: `app/aqar/**`, `modules/aqar/**`

Do NOT mix domain logic across boundaries without explicit architectural justification.

## Constraints & Expectations

- Do not scan the entire repo blindly; always start from the memory index.
- Keep pull requests / changesets narrowly focused.
- Do not remove or rewrite domain logic without a clear reason.
- Preserve existing coding style and naming conventions.
- Add or update tests when behavior changes.
- **No placeholders** - No "TODO", "TBD", or fake data.
- **Respect tenant isolation** - All queries must include `orgId` scoping.
- **Use `tenantIsolationPlugin`** - For all tenant-scoped Mongoose models.

## Multi-Tenancy Rules

- All database queries MUST be scoped by `orgId`
- Use `tenantIsolationPlugin` for Mongoose models
- Never expose data from one tenant to another
- Super Admin cross-tenant access must be audit-logged

## RBAC Rules

- Use `getSessionUser()` for session extraction
- Use `requireAbility()` for work order permissions
- Never trust client-side role checks
- Follow role hierarchy: SUPER_ADMIN > ADMIN > MANAGER > USER

## When the Memory is Stale

If you detect that `ai-memory/master-index.json` is missing many new files or does not match the current structure:

- Suggest re-running the memory pipeline:
  - `node tools/smart-chunker.js`
  - Process new batches via Inline Chat (Ctrl+I / Cmd+I)
  - `node tools/merge-memory.js`
- Then retry the task with the updated index.

## Testing Requirements

- Add unit tests for new utility functions
- Add integration tests for new API routes
- Add E2E tests for critical user flows
- All tests must pass before PR merge

## PR Workflow

1. Create feature branch: `feat/<task>` or `fix/<issue>`
2. Make changes
3. Verify: `pnpm typecheck && pnpm lint && pnpm test`
4. Commit with conventional format: `feat(scope): description`
5. Push and create draft PR: `gh pr create --fill --draft`
6. **NEVER push directly to main/master**

---

**Version**: 2.0  
**Last Updated**: 2025-12-09
