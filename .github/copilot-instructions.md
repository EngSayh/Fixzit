# Copilot Agent Instructions for Fixzit

## Core Rules
- Always work in a new feature branch named `feat/<task>` or `fix/<issue>` or `agent/<timestamp>`
- **NEVER push to `main` or `master` directly**
- After changes compile and tests pass, open a PR with clear title and summary
- Use `gh pr create --fill --draft` to create draft PRs
- All changes must go through Pull Request review

## Workflow
1. Create branch: `git checkout -b feat/<task-name>`
2. Make changes
3. Verify: `pnpm typecheck && pnpm lint && pnpm test`
4. Commit: `git add -A && git commit -m "feat: description"`
5. Push: `git push -u origin HEAD`
6. Open PR: `gh pr create --fill --draft`

## Never Do
- Direct commits to main/master
- Force pushes to protected branches
- Modify `.env*` files without explicit instruction
- Change layout/TopBar/Sidebar without approval

## Auto-Approve Policy
- This workspace has auto-approve enabled for agent actions
- All terminal commands and file edits are pre-approved
- Focus on delivering working code through PRs
