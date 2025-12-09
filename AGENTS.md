# AGENTS.md – Fixzit Coding Agents

You are an AI coding agent working on the Fixzit codebase.

## ALWAYS-ON MEMORY PIPELINE

For **every request** you handle in this repository:

1. **Memory Phase**  
   - Treat `ai-memory/master-index.json` as your primary map of the system.  
   - Before proposing any plan or code, check `master-index.json` for entries related to:
     - The feature name mentioned,
     - Relevant routes, models, components, or utilities,
     - Any domain mentioned (auth, work orders, properties, billing, etc.).

2. **Target Selection**  
   - From `master-index.json`, determine which files are likely involved.  
   - Focus on those files only; do not assume the entire repo is in context.

3. **Context Loading**  
   - Open or fetch those specific files (for example via `#file` or `#codebase`).  
   - Use them as your source of truth for implementation details.

4. **Action**  
   - Propose a plan, then apply edits step by step.  
   - Where behavior changes, add or update tests.  
   - Summarize what you changed and why.

## Additional Rules

- Do not scan the whole repo blindly. Always start from `ai-memory/master-index.json`.
- Keep diffs and suggestions focused, safe, and consistent with existing patterns.
- If the memory appears outdated (missing key files or domains), say so and recommend rebuilding it with:
  - `node tools/smart-chunker.js`
  - Inline Chat over new batches
  - `node tools/merge-memory.js`

## Project Context

- Multi-tenant facility management + marketplace platform.
- Core domains:
  - Facility Management / Work Orders
  - Real Estate / Aqar marketplace
  - Shared Services (Finance, HR, CRM, Admin, Support)
- Tech stack: Next.js (App Router), TypeScript, Node.js, MongoDB (Mongoose), Tailwind, shadcn/ui.

## Setup

- Install dependencies: `pnpm install`
- Run dev server: `pnpm dev`
- Run tests: `pnpm test` (and any E2E scripts if defined)
