# Build Environment Configuration

> **Last Updated**: 2025-01-17  
> **Maintainers**: Engineering Team

## Overview

This document describes the build environment requirements and common troubleshooting steps for the Fixzit codebase.

## VS Code Debugger Interference

### Problem

When VS Code's debugger is attached (auto-attach enabled), Next.js builds fail with:

```
Error: Cannot find module '../../../../webpack-runtime.js'
    at createEsmNotFoundErr (node:internal/modules/cjs/loader:1262:15)
```

Or:

```
ENOENT: no such file or directory, open '.next/app-build-manifest.json'
```

### Root Cause

VS Code's JavaScript debugger attaches to Node.js workers spawned by Next.js/Webpack. This interferes with webpack's internal module resolution.

### Solution

Disable debugger inspection when running builds:

```bash
# Production build
NODE_OPTIONS='' pnpm build

# Or explicitly
NODE_OPTIONS='' npx next build
```

### Permanent Fix Options

#### Option 1: VS Code Auto-Attach Settings

1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Search "Debug: Toggle Auto Attach"
3. Set to "Disabled" or "Only With Flag"

#### Option 2: Create Build Task

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build (No Debugger)",
      "type": "shell",
      "command": "NODE_OPTIONS='' pnpm build",
      "problemMatcher": []
    }
  ]
}
```

#### Option 3: Package.json Script

```json
{
  "scripts": {
    "build": "NODE_OPTIONS='' next build"
  }
}
```

## Development Commands

```bash
# Development server (debugger OK)
pnpm dev

# Production build (needs NODE_OPTIONS='')
NODE_OPTIONS='' pnpm build

# Type checking (debugger OK)
pnpm typecheck

# Linting (debugger OK)
pnpm lint

# Run tests (debugger OK)
pnpm test:models
pnpm vitest run
```

## Environment Variables

### Required for Production

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
AUTH_SECRET=...
NEXTAUTH_URL=https://...

# MongoDB (optional but recommended)
MONGODB_URL=mongodb+srv://...
```

### Optional for Development

```bash
# Disable telemetry
NEXT_TELEMETRY_DISABLED=1

# Skip MongoDB features
# Just don't set MONGODB_URL

# Development authentication
AUTH_SECRET=dev-secret-32-chars-min
```

## Common Build Errors

### 1. "Cannot find module 'webpack-runtime.js'"

**Solution**: Run with `NODE_OPTIONS=''`

### 2. "MONGODB_URI is not defined"

**Solution**: Create `.env.local` with required variables

### 3. "Module not found: Can't resolve 'dns'"

**Cause**: Edge runtime code importing Node.js modules

**Solution**: Check that imports in API routes/middleware don't use the MongoDB driver directly. Use `lib/mongodb-unified.ts` (or `lib/mongo.ts`) which enforces server-only access.

### 4. ESLint Memory Issues

```bash
# Increase Node memory for large linting runs
NODE_OPTIONS='--max-old-space-size=4096' pnpm lint
```

### 5. TypeScript "Cannot find module" After Dependency Update

```bash
# Clear TypeScript cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall
pnpm install

# Rebuild
NODE_OPTIONS='' pnpm build
```

## CI/CD Notes

GitHub Actions doesn't have VS Code debugger, so `NODE_OPTIONS=''` is not needed in CI. The build workflow uses:

```yaml
- name: Build
  run: pnpm build
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
    # ... other env vars
```

## Performance Tips

### 1. Parallel Type Checking

```bash
# Run typecheck and lint in parallel
pnpm typecheck & pnpm lint & wait
```

### 2. Incremental Builds

Next.js caches builds in `.next/cache`. Don't delete `.next/` during development unless needed.

### 3. Selective Test Runs

```bash
# Run only specific test file
pnpm vitest run tests/unit/lib/db/collections.test.ts

# Run only model tests
pnpm test:models
```

## Troubleshooting Checklist

1. ✅ VS Code debugger disabled for builds?
2. ✅ `.env.local` exists with required vars?
3. ✅ Node.js v20.x installed?
4. ✅ pnpm v9.x installed?
5. ✅ `node_modules` fresh? (`rm -rf node_modules && pnpm install`)
6. ✅ `.next` cache clean? (`rm -rf .next`)
