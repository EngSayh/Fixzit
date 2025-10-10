# GitHub Copilot Agent Instructions

## PR Workflow Guidelines

- **Always work in a new branch** named `bot/<timestamp>` or `copilot/<feature-name>`.
- **Never push to `main` directly** — all changes must go through pull requests.
- After changes compile and tests pass, **open a PR** with a clear title and summary.

## Development Workflow

1. Create a feature branch from `main`
2. Make incremental changes with clear commit messages
3. Run tests and linting before committing
4. Open a pull request when ready for review
5. Branch protection on `main` enforces PR-only workflow

## Testing Requirements

- Run `npm run typecheck` to verify TypeScript compilation
- Run `npm run lint` to check code quality
- Run `npm run test` for unit tests
- Run `npm run test:e2e` for end-to-end tests (when applicable)

## Code Quality Standards

- Follow existing code patterns and conventions
- Maintain test coverage for new features
- Update documentation for significant changes
- Address all linting errors and warnings

## Security Guidelines

- Never commit secrets or sensitive data
- Follow tenant isolation patterns in multi-tenant code
- Use proper error handling without message leakage
- Validate all user inputs appropriately

## Agent Governor Compliance

This repository uses the Agent Governor system for automated verification:
- Auto-approval is enabled for standard development commands
- All changes are tracked and verified through CI/CD pipelines
- See `docs/FINAL_VERIFICATION_REPORT.md` for governance details
