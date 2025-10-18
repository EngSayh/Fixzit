# Turbopack/Webpack Warning Explanation

## The Warning Message

When running `npm run dev`, you may see:

```
⚠ Webpack is configured while Turbopack is not, which may cause problems.
⚠ See instructions if you need to configure Turbopack:
  https://nextjs.org/docs/app/api-reference/next-config-js/turbopack
```

## Why This Happens (And Why It's Safe)

### ✅ **This warning is EXPECTED and SAFE to ignore**

Here's what's happening:

1. **Development Mode (`npm run dev`):**
   - Uses Turbopack via `--turbo` flag
   - Turbopack is Next.js 15's new fast bundler
   - Ignores webpack configuration
   - **Much faster** build times (1-2 seconds vs 8+ seconds)

2. **Production Mode (`npm run build`):**
   - Always uses Webpack (Turbopack not ready for production yet)
   - Applies all webpack optimizations
   - Memory-optimized for Codespaces environment

3. **Why Both Configs Exist:**
   - Webpack config is REQUIRED for production builds
   - Turbopack is OPTIONAL for faster development
   - Next.js warns that webpack config exists but won't be used in dev

## Your Options

### Option 1: Keep Using Turbopack (Recommended) ⚡

**Command:** `npm run dev`

**Pros:**

- ✅ Fast startup (1-2 seconds)
- ✅ Fast hot reload
- ✅ Lower memory usage
- ✅ Next.js 15 recommended approach

**Cons:**

- ⚠️ See this warning (cosmetic only)
- ⚠️ Webpack dev config is ignored

### Option 2: Use Webpack in Development

**Command:** `npm run dev:webpack`

**Pros:**

- ✅ No warnings
- ✅ Consistent with production
- ✅ Uses file polling for OneDrive

**Cons:**

- ⛔ Slower startup (8+ seconds)
- ⛔ Slower hot reload
- ⛔ Higher memory usage

## What's Actually Different?

### Features Working in BOTH Modes

- ✅ All Next.js features
- ✅ API routes
- ✅ TypeScript
- ✅ CSS/Tailwind
- ✅ Image optimization
- ✅ File-based routing

### Features ONLY in Webpack Dev Mode

- Custom webpack loaders (we don't use any)
- Custom webpack plugins (we don't use any)
- File polling for OneDrive (Turbopack has better file watching)

## Production Builds

**Production builds ALWAYS use Webpack** regardless of dev mode choice:

```bash
npm run build  # Always uses Webpack with all optimizations
```

Our production webpack config includes:

- Memory optimizations for Codespaces (2GB RAM limit)
- Chunk splitting for optimal loading
- Source map generation for error tracking
- Module ID optimization
- Parallelism limits to prevent OOM

## Recommendation

**✅ Use `npm run dev` (Turbopack)** for daily development

Only switch to `npm run dev:webpack` if you:

- Need to debug webpack-specific issues
- Want to test production webpack behavior in dev
- Have file watching issues (unlikely with Turbopack)

## Technical Details

### Turbopack Architecture

- Written in Rust (faster than JavaScript webpack)
- Incremental compilation (only rebuilds changed files)
- Better caching strategy
- Native ESM support

### Our Webpack Config

- Only applied during `next build` (production)
- Optimized for 2GB RAM Codespaces environment
- Single-threaded to prevent memory spikes
- Source maps for CI/CD error tracking

## References

- [Next.js 15 Turbopack Docs](https://nextjs.org/docs/app/api-reference/next-config-js/turbopack)
- [Turbopack Performance](https://turbo.build/pack/docs/benchmarks)
- [Webpack vs Turbopack](https://nextjs.org/docs/architecture/turbopack)

---

**Last Updated:** October 17, 2025  
**Next.js Version:** 15.5.4  
**Turbopack:** Stable for Development, Beta for Production
