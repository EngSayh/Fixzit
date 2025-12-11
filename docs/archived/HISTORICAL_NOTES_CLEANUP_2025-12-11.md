# Historical Notes Cleanup — 2025-12-11
**Purpose**: Remove inline historical comments while preserving context. Addresses `TODO-DOC-002` from `docs/PENDING_MASTER.md`.

## SystemVerifier dynamic component status
- **Previous note**: Inline reminder that component cards were static and should call `autoFixManager.getComponentStatus()` in the future.
- **Current state**: `components/SystemVerifier.tsx` renders static component labels because `AutoFixManager` only returns global health today.
- **Follow-up**: When per-component status APIs land, wire the grid to those APIs and drop the static labels. Until then, the UI documents the limitation via this archive note rather than inline comments.

## Admin users route password hashing
- **Previous note**: Historical reminder that the route once stored plaintext passwords.
- **Current state**: `app/api/admin/users/route.ts` requires a password and hashes it with `bcrypt.hash(password, 12)` before persistence. No default passwords are permitted.
- **Follow-up**: Keep the bcrypt cost in sync with security guidance; add regression tests if the route changes.
