# Fixzit Agents Instructions

You are an AI agent working on the Fixzit codebase in VS Code or on GitHub.

## Project Summary

- **Project**: Fixzit – multi-tenant facility management + marketplace platform
- **Stack**: Next.js 15, TypeScript, Node.js, MongoDB (Mongoose), Tailwind, shadcn/ui
- **Goals**: Production-grade, modular architecture with strict governance, no placeholders, and clear domain boundaries

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Unit tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Build for production
pnpm build
```

## Core Behaviour

- Treat `ai-memory/master-index.json` as the **primary map** of the system
- Use it *before* scanning raw code for:
  - Architectural questions
  - Large refactors
  - Multi-file changes

## Memory-Aware Workflow

When assigned a task (e.g., "refactor auth login" or "add new work order status"):

1. **Read** `ai-memory/master-index.json`
2. **Identify** all relevant files based on:
   - `category` (routes, models, components, utils, core)
   - `file` paths
   - `summary`, `exports`, `dependencies`
3. **Open** or fetch only those files as context
4. **Propose** a plan with:
   - Steps
   - Files to touch
   - Potential side effects
5. **Execute** edits step by step, keeping changes consistent with existing patterns
6. **Test** - Add or update tests where possible

## File Categories

| Category | Path Patterns | Purpose |
|----------|---------------|---------|
| routes | `app/api/**`, `**/route.ts` | API endpoints |
| models | `server/models/**`, `**/schema.ts` | Database schemas |
| components | `components/**`, `app/**/*.tsx` | React components |
| utils | `lib/**`, `utils/**`, `helpers/**` | Utility functions |
| core | Everything else | Config, types, constants |

## Domain Boundaries (STRICT)

- **FM (Facility Management)**: `app/fm/**`, `domain/fm/**`
- **Marketplace/Souq**: `app/souq/**`, `app/marketplace/**`
- **Finance**: `app/finance/**`, `modules/finance/**`
- **HR**: `app/hr/**`, `modules/hr/**`
- **CRM**: `app/crm/**`, `modules/crm/**`
- **Aqar (Property)**: `app/aqar/**`, `modules/aqar/**`

Do NOT mix domain logic across boundaries without explicit architectural justification.

## Constraints

- **Never assume the entire repo is in context** - Use the memory index to load only what is needed
- **Keep diffs minimal and focused** - Small, atomic changes
- **No placeholders** - No "TODO", "TBD", or fake data
- **Do not remove or rewrite domain logic without clear reason**
- **Respect tenant isolation** - All queries must include `orgId` scoping
- **Use `tenantIsolationPlugin`** - For all tenant-scoped Mongoose models

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

**Version**: 1.0  
**Last Updated**: 2025-12-09
