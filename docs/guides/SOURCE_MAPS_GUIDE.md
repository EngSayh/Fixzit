# Source Map Configuration Guide

## Overview

This project is configured to generate **hidden source maps** in production builds. This enables detailed error stack traces in your error tracking service (like Sentry) without exposing source code to end users.

## Configuration

### next.config.js

```javascript
// Development: No source maps (fast builds, memory efficient)
config.devtool = false;

// Production (CI only): Generate hidden source maps
if (!dev && process.env.CI === "true") {
  config.devtool = "hidden-source-map";
  // This generates .map files but doesn't reference them in the bundles
  // Users won't see or download source maps, but error tracking can use them
}
```

### Source Map Types

| Type                   | Description                     | Exposed to Users? | Use Case                       |
| ---------------------- | ------------------------------- | ----------------- | ------------------------------ |
| `false`                | No source maps                  | N/A               | Development (memory savings)   |
| `hidden-source-map`    | Full maps, no bundle reference  | ❌ No             | **Production (recommended)**   |
| `nosources-source-map` | Maps without source content     | ❌ No             | Production (smaller maps)      |
| `source-map`           | Full maps with bundle reference | ✅ Yes            | Not recommended for production |

## How It Works

### 1. Build Process

When `CI=true` (GitHub Actions), the build generates:

- Regular bundles: `.next/static/chunks/*.js`
- Hidden source maps: `.next/static/chunks/*.js.map`

The JavaScript bundles **do not** include `//# sourceMappingURL=` comments, so browsers won't request or download the `.map` files.

### 2. Error Tracking Integration

Source maps are uploaded to your error tracking service via GitHub Actions:

```yaml
# .github/workflows/build-sourcemaps.yml
- name: Upload source maps to Sentry
  run: |
    sentry-cli releases new "$GITHUB_SHA"
    sentry-cli releases files "$GITHUB_SHA" upload-sourcemaps .next --rewrite
    sentry-cli releases finalize "$GITHUB_SHA"
```

### 3. Error Resolution

When an error occurs in production:

1. User's browser sends error with minified stack trace
2. Error tracking service receives the error
3. Service uses uploaded source maps to transform the stack trace
4. You see the original source code locations and function names

## Setup Instructions

### Option A: Sentry (Recommended)

1. **Install Sentry SDK**:

   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry**:

   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Add GitHub Secrets**:
   Go to: <https://github.com/EngSayh/Fixzit/settings/secrets/actions>

   Add these secrets:
   - `SENTRY_AUTH_TOKEN`: Your Sentry auth token
   - `SENTRY_ORG`: Your Sentry organization slug
   - `SENTRY_PROJECT`: Your Sentry project slug

4. **Enable workflow**:
   The workflow `.github/workflows/build-sourcemaps.yml` will automatically upload maps on every push to `main`.

### Option B: Custom Error Tracking Service

If you use a different error tracking service:

1. **Modify the workflow**:
   Edit `.github/workflows/build-sourcemaps.yml` and uncomment the "custom service" section:

   ```yaml
   - name: Upload source maps to custom service
     run: |
       find .next -name "*.map" -type f | while read mapfile; do
         curl -X POST \
           -F "file=@$mapfile" \
           -H "Authorization: Bearer ${{ secrets.ERROR_TRACKING_TOKEN }}" \
           https://your-error-tracking-service.com/api/sourcemaps
       done
   ```

2. **Add your service URL and token** as GitHub secrets.

### Option C: Manual Download (Fallback)

If you need source maps for manual debugging:

1. **Download from GitHub Actions artifacts**:
   - Go to: <https://github.com/EngSayh/Fixzit/actions>
   - Click on a successful build
   - Download "source-maps" artifact
   - Extract and use with browser DevTools

## Testing Source Maps

### Local Testing

1. **Build with source maps**:

   ```bash
   CI=true npm run build
   ```

2. **Verify source maps were generated**:

   ```bash
   find .next -name "*.map" -type f | wc -l
   # Should show multiple .map files
   ```

3. **Check source map is hidden**:

   ```bash
   # Open a built JS file
   cat .next/static/chunks/app/page-*.js | grep sourceMappingURL
   # Should return nothing (no sourceMappingURL comment)
   ```

### Production Testing

1. **Trigger an error in production**
2. **Check your error tracking dashboard** (Sentry, etc.)
3. **Verify stack traces show original source code**:
   - Should see actual file names (e.g., `src/app/page.tsx`)
   - Should see original function names
   - Should see correct line numbers

## Performance Impact

### Build Time

| Configuration      | Build Time (4-core/16GB) | Source Map Size |
| ------------------ | ------------------------ | --------------- |
| No source maps     | 30-35 seconds            | 0 MB            |
| Hidden source maps | 35-45 seconds            | ~10-20 MB       |

**Trade-off**: Slightly longer builds for much better error debugging.

### User Experience

- ✅ **No impact on users**: Source maps are never downloaded by browsers
- ✅ **Same bundle size**: JavaScript bundles are identical
- ✅ **Same load times**: No additional network requests

## Security Considerations

### ✅ Hidden Source Maps (Current Configuration)

- Source maps exist but are not referenced
- Users cannot access or download them
- Only available to error tracking service
- Source code remains private

### ❌ Regular Source Maps (NOT recommended)

- Source maps are referenced in bundles
- Users can download and view source code
- Exposes intellectual property
- Security risk

## Troubleshooting

### Issue: No source maps generated

**Check**:

```bash
# Ensure CI=true is set
CI=true npm run build

# Look for .map files
find .next -name "*.map"
```

### Issue: Error tracking shows minified code

**Possible causes**:

1. Source maps not uploaded to error tracking service
2. Incorrect release/version matching
3. Source map files missing from build

**Solution**:

1. Check GitHub Actions logs for upload errors
2. Verify source maps exist in artifacts
3. Re-run the build workflow

### Issue: Build fails with source maps enabled

**Possible causes**:

1. Insufficient memory (need 4GB+ for source map generation)
2. Webpack configuration conflict

**Solution**:

1. Build on proper hardware (4-core/16GB minimum)
2. Check next.config.js for conflicting webpack settings

## Best Practices

1. ✅ **Always enable hidden source maps in production**
   - Helps debug production errors quickly
   - No security or performance cost to users

2. ✅ **Upload maps to error tracking automatically**
   - Use CI/CD pipeline (GitHub Actions)
   - Don't manually manage source maps

3. ✅ **Keep maps for 30+ days**
   - Old maps help debug issues in older deployments
   - GitHub Actions stores artifacts for 30 days by default

4. ✅ **Test error tracking in staging first**
   - Verify source maps are working before production deploy
   - Check that stack traces are properly transformed

5. ❌ **Never commit .map files to git**
   - Already in .gitignore
   - Generated at build time
   - Can be very large (10-20 MB)

## Additional Resources

- [Next.js Source Maps Documentation](https://nextjs.org/docs/app/building-your-application/configuring/source-maps)
- [Webpack devtool Configuration](https://webpack.js.org/configuration/devtool/)
- [Sentry Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## Summary

✅ **Current configuration**: Hidden source maps enabled in CI production builds  
✅ **User impact**: Zero (maps not exposed or downloaded)  
✅ **Developer benefit**: Full source code visibility in error tracking  
✅ **Automation**: GitHub Actions uploads maps automatically

Your production errors will now show original source code instead of minified code! 🎉
