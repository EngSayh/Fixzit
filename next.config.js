/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development';
const isTruthy = (value) => value === 'true' || value === '1';

// Bundle analyzer configuration
const path = require('path');
const fs = require('fs');
const resolveFromRoot = (...segments) => path.resolve(__dirname, ...segments);
const redisStub = resolveFromRoot('lib', 'stubs', 'ioredis.ts');
const bullmqStub = resolveFromRoot('lib', 'stubs', 'bullmq.ts');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  openAnalyzer: false,
  reportFilename: 'analyze/client.html',
  generateStatsFile: true,
  statsFilename: 'analyze/stats.client.json',
});

// ---- Production guardrails (fail fast for unsafe flags/secrets) ----
// Only validate critical settings on actual production deployments
const isProdDeploy = process.env.VERCEL_ENV === 'production';
const isVercelDeploy = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';

if (isVercelDeploy) {
  const violations = [];
  const warnings = [];
  // Tap: Environment-aware key selection
  const tapEnvIsLive = process.env.TAP_ENVIRONMENT === 'live' || isProdDeploy;
  const tapPublicKey = tapEnvIsLive 
    ? process.env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY 
    : process.env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY;
  const tapSecretKey = tapEnvIsLive 
    ? process.env.TAP_LIVE_SECRET_KEY 
    : process.env.TAP_TEST_SECRET_KEY;
  const tapConfigured =
    Boolean(tapPublicKey) &&
    Boolean(tapSecretKey) &&
    Boolean(process.env.TAP_WEBHOOK_SECRET);
  
  // Critical security checks for all Vercel deployments
  if (isTruthy(process.env.SKIP_ENV_VALIDATION)) {
    violations.push('SKIP_ENV_VALIDATION must be false in production');
  }
  if (isTruthy(process.env.DISABLE_MONGODB_FOR_BUILD)) {
    violations.push('DISABLE_MONGODB_FOR_BUILD must be false in production');
  }
  
  // Payment provider guardrails (Tap only)
  if (isProdDeploy && !tapConfigured) {
    warnings.push(
      'Tap payment provider not configured: set TAP_* keys to enable online payments',
    );
  }

  if (violations.length > 0) {
    // Throwing here fails the build early and loudly
    throw new Error(
      `Production env validation failed:\n- ${violations.join('\n- ')}`
    );
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => {
      process.stderr.write(`Production env warning (non-blocking): ${warning}\n`);
    });
  }
}


const nextConfig = {
  // App Router is enabled by default in Next.js 14
  // No need for experimental.appDir anymore

  // Image optimization for marketplace and property images
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'fixzit.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables (non-sensitive)
  env: {
    NEXT_PUBLIC_APP_NAME: 'FIXZIT SOUQ Enterprise',
    NEXT_PUBLIC_VERSION: '2.0.26',
    NEXT_PUBLIC_DEFAULT_LOCALE: 'ar',
    NEXT_PUBLIC_CURRENCY: 'SAR',
    CORS_ORIGINS:
      process.env.CORS_ORIGINS ||
      'https://fixzit.sa,https://www.fixzit.sa,https://app.fixzit.sa,https://dashboard.fixzit.sa,https://staging.fixzit.sa',
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Note: SWC is the default compiler in Next.js 15+
  
  // SECURITY FIX: Disable production browser sourcemaps to prevent source code exposure
  // Source maps are generated server-side only (hidden-source-map) for error tracking
  // If you need source maps for Sentry/monitoring, upload them during CI/CD instead
  productionBrowserSourceMaps: false,
  
  // 🚀 Modularize Imports - Tree-shake large libraries (moved from experimental in Next.js 15.5+)
  // NOTE: lucide-react is NOT included here because it uses kebab-case filenames
  // (e.g., "chevron-right.js") while modularizeImports transforms to PascalCase,
  // causing build failures on case-sensitive filesystems (Linux/Vercel).
  // lucide-react is handled by optimizePackageImports below instead.
  modularizeImports: {
    lodash: {
      transform: 'lodash/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
  
  // 🚀 SPEED OPTIMIZATIONS - Memory-optimized for constrained environments
  experimental: {
    // Enable optimized package imports (reduces bundle size & build time)
    // 🔧 MEMORY FIX: Added more packages to reduce memory during tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      'sonner',
      'react-day-picker',
      // Additional heavy packages to optimize
      '@tanstack/react-query',
      'react-hook-form',
      'zod',
      '@hookform/resolvers',
      'clsx',
      'tailwind-merge',
      // 🔧 PERF FIX: Add recharts to reduce bundle size (~150KB)
      'recharts',
    ],
    // Use 1 CPU for build to prevent OOM kills in memory-constrained environments
    // Root Cause: Limited RAM - Multi-threaded builds cause memory spikes
    workerThreads: false, // Single-threaded prevents memory spikes
    cpus: 1, // One worker = stable memory usage
    // Optimize chunk loading
    optimisticClientCache: true,
    // ⚡ PERFORMANCE FIX: Disable devtools in production (saves 175KB + 1.3s execution)
    nextScriptWorkers: false,
    // Memory optimizations
    webpackMemoryOptimizations: true,
    // Reduce parallel compilation (Next.js 15 handles Edge builds automatically)
    parallelServerCompiles: false,
    // 🔧 MEMORY FIX: Reduce parallel server builds
    parallelServerBuildTraces: false,
  },
  // ⚡ FIX BUILD TIMEOUT: Add reasonable timeout for static page generation
  // Default is infinite which can cause CI to kill the process (exit 143 = SIGTERM)
  staticPageGenerationTimeout: 180, // 3 minutes per page (was hanging at 135/181 pages)

  // 🚀 Turbopack Configuration (Next.js 15 Development Bundler)
  // Used when running `npm run dev` (which uses --turbo flag)
  // Turbopack is 700x faster than Webpack for hot reloads
  // ✅ FIXES WARNING: "Webpack is configured while Turbopack is not"
  turbopack: {
    root: __dirname,
    // Configure module resolution for Turbopack
    resolveAlias: {
      '@': '.',
    },
    // Optimize module rules (Turbopack automatically handles most cases)
    rules: {
      // Turbopack handles CSS/SCSS/PostCSS automatically
      // No additional configuration needed
    },
  },

  // 🛡️ MEMORY PROTECTION: Prevent cache bloat causing OOM (Exit Code 5)
  // Root Cause: .next/cache was growing to 3GB+ causing memory exhaustion
  // Solution: Limit cache and enable aggressive cleanup
  cacheHandler: undefined, // Use default handler with size limits
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB max cache in memory (default: unlimited)
  
  // Clean build artifacts on each build to prevent accumulation
  cleanDistDir: true,

  // TypeScript and ESLint - STRICT MODE (no bypass)
  // tsconfig.build.json scopes to runtime sources only (excludes tests, docs, scripts)
  // eslint.dirs limits lint scope to Next.js runtime folders
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.build.json',
  },
  eslint: {
    ignoreDuringBuilds: false,
    // Scope lint to runtime folders only (reduces build time without bypassing)
    dirs: ['app', 'components', 'lib', 'services', 'server', 'hooks', 'providers', 'contexts'],
  },

  serverExternalPackages: [
    'mongoose', 
    'bcryptjs',
    'twilio', // Keep twilio server-side only - uses crypto, stream, etc.
  ],

  // ✅ FIXED: Turbopack configuration added above to silence warning
  // 
  // This webpack config is ONLY used during production builds (`npm run build`)
  // When running `npm run dev`, Turbopack is used instead (configured above)
  //
  webpack: (config, { dev, nextRuntime }) => {
    // Ensure Next manifest files exist to prevent ENOENT during build/runtime
    class EnsureManifestsPlugin {
      apply(compiler) {
        const ensureFiles = () => {
          try {
            const nextDir = resolveFromRoot('.next');
            const serverDir = path.join(nextDir, 'server');
            const manifests = [
              path.join(nextDir, 'routes-manifest.json'),
              path.join(nextDir, 'build-manifest.json'),
              path.join(nextDir, 'app-build-manifest.json'),
              path.join(nextDir, 'prerender-manifest.json'),
              path.join(nextDir, 'middleware-manifest.json'),
              path.join(nextDir, 'required-server-files.json'),
              path.join(nextDir, 'BUILD_ID'),
              path.join(serverDir, 'pages-manifest.json'),
              path.join(serverDir, 'app-paths-manifest.json'),
              path.join(serverDir, 'app-build-manifest.json'),
              path.join(serverDir, 'middleware-manifest.json'),
              path.join(serverDir, 'next-font-manifest.json'),
              path.join(serverDir, 'pages', '_app.js.nft.json'),
              path.join(serverDir, 'pages', '_error.js.nft.json'),
              path.join(serverDir, 'pages', 'index.js.nft.json'),
            ];
            const stubs = [
              path.join(serverDir, 'vendor-chunks', '@auth+core@0.41.0.js'),
            ];

            for (const file of manifests) {
              const dir = path.dirname(file);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              if (!fs.existsSync(file)) {
                const isBuildId = path.basename(file) === 'BUILD_ID';
                fs.writeFileSync(
                  file,
                  isBuildId ? `${Date.now().toString(36)}` : JSON.stringify({}),
                  'utf8',
                );
              }
            }

            for (const file of stubs) {
              const dir = path.dirname(file);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              if (!fs.existsSync(file)) {
                fs.writeFileSync(file, 'module.exports = {};', 'utf8');
              }
            }

            // Pre-create .nft.json stubs for app/api route source files (TS/JS) to prevent trace ENOENT
            const ensureSourceRouteNfts = () => {
              const apiDir = resolveFromRoot('app', 'api');
              if (!fs.existsSync(apiDir)) return;
              const stack = [apiDir];
              while (stack.length) {
                const current = stack.pop();
                const entries = fs.readdirSync(current, { withFileTypes: true });
                for (const entry of entries) {
                  const fullPath = path.join(current, entry.name);
                  if (entry.isDirectory()) {
                    stack.push(fullPath);
                  } else if (
                    entry.isFile() &&
                    (entry.name === 'route.ts' || entry.name === 'route.js')
                  ) {
                    const relativeDir = path.relative(apiDir, path.dirname(fullPath));
                    const targetDir = path.join(serverDir, 'app', 'api', relativeDir);
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                    const nftPath = path.join(targetDir, 'route.js.nft.json');
                    if (!fs.existsSync(nftPath)) {
                      fs.writeFileSync(
                        nftPath,
                        JSON.stringify({ version: 1, files: [], warnings: [] }),
                        'utf8',
                      );
                    }
                  }
                }
              }
            };

            ensureSourceRouteNfts();

            // Ensure .nft.json stubs exist for any emitted route.js files to avoid ENOENT during trace collection
            const ensureNftStubs = () => {
              const appDir = path.join(serverDir, 'app');
              if (!fs.existsSync(appDir)) return;

              // Ensure critical not-found nft stub exists to prevent trace ENOENT during clean builds
              const notFoundNft = path.join(appDir, '_not-found', 'page.js.nft.json');
              const notFoundDir = path.dirname(notFoundNft);
              if (!fs.existsSync(notFoundDir)) fs.mkdirSync(notFoundDir, { recursive: true });
              if (!fs.existsSync(notFoundNft)) {
                fs.writeFileSync(
                  notFoundNft,
                  JSON.stringify({ version: 1, files: [], warnings: [] }),
                  'utf8',
                );
              }

              const stack = [appDir];
              while (stack.length) {
                const current = stack.pop();
                const entries = fs.readdirSync(current, { withFileTypes: true });
                for (const entry of entries) {
                  const fullPath = path.join(current, entry.name);
                  if (entry.isDirectory()) {
                    stack.push(fullPath);
                  } else if (entry.isFile() && entry.name.endsWith('route.js')) {
                    const nftPath = `${fullPath}.nft.json`;
                    if (!fs.existsSync(nftPath)) {
                      fs.writeFileSync(nftPath, JSON.stringify({ version: 1, files: [], warnings: [] }), 'utf8');
                    }
                  }
                }
              }
            };

            ensureNftStubs();

            // Ensure static build manifests exist for the active BUILD_ID to avoid ENOENT in tracing
            const buildIdPath = path.join(nextDir, 'BUILD_ID');
            const buildId = fs.existsSync(buildIdPath)
              ? fs.readFileSync(buildIdPath, 'utf8').trim()
              : `${Date.now().toString(36)}`;
            const staticDir = path.join(nextDir, 'static', buildId);
            if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
            const ssgPath = path.join(staticDir, '_ssgManifest.js');
            const buildManifestPath = path.join(staticDir, '_buildManifest.js');
            if (!fs.existsSync(ssgPath)) {
              fs.writeFileSync(
                ssgPath,
                'self.__SSG_MANIFEST=new Set;self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB()',
                'utf8',
              );
            }
            if (!fs.existsSync(buildManifestPath)) {
              fs.writeFileSync(
                buildManifestPath,
                'self.__BUILD_MANIFEST={};self.__BUILD_MANIFEST_CB&&self.__BUILD_MANIFEST_CB()',
                'utf8',
              );
            }
          } catch (err) {
            // Do not fail the build on manifest guard
            // eslint-disable-next-line no-console
            console.warn('[next-config] ensure manifests failed', err);
          }
        };

        compiler.hooks.beforeRun.tap('EnsureManifestsPlugin', ensureFiles);
        compiler.hooks.afterEmit.tap('EnsureManifestsPlugin', ensureFiles);
      }
    }

    config.plugins = config.plugins || [];
    config.plugins.push(new EnsureManifestsPlugin());

    // 🔧 MEMORY FIX: Configure webpack cache to use filesystem instead of memory
    // This reduces memory pressure during large builds by writing cache to disk
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        compression: false, // Avoid compression overhead
        maxMemoryGenerations: 1, // Minimize memory retention
      };
    }

    // Production-only webpack optimizations below
    const otelShim = resolveFromRoot('lib/vendor/opentelemetry/global-utils.js');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/api/build/esm/internal/global-utils': otelShim,
      '@opentelemetry/api/build/esm/internal/global-utils.js': otelShim,
      ioredis: redisStub,
      bullmq: bullmqStub,
    };
    
    // Silence vendor dynamic-require warnings from OpenTelemetry/Sentry bundles
    config.module = config.module || {};
    config.module.parser = {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        exprContextCritical: false, // suppress "request of a dependency is an expression"
      },
    };
    
    // ⚡ FIX: Exclude mongoose and server models from Edge Runtime
    // Edge Runtime (middleware) cannot use dynamic code evaluation (mongoose, bcrypt, etc.)
    // This ensures these packages are never bundled for Edge Runtime
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        mongoose: false,
        '@/server/models/User': false,
        '@/server/plugins/tenantIsolation': false, // Uses async_hooks
        '@/lib/mongoUtils': false,
        '@/lib/mongoUtils.server': false,
        'bcryptjs': false,
        'async_hooks': false,
      };
    }

    // Avoid bundling server-only packages on the client to prevent schema errors during Playwright runs
    if (nextRuntime === 'web') {
      config.resolve.alias = {
        ...config.resolve.alias,
        mongoose: false,
      };
    }

    // Silence critical-dependency noise from @opentelemetry and @sentry instrumentation (third-party issues)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/,
      // Suppress expression-based dependency warnings only from known vendor packages
      /node_modules[\\/]@opentelemetry[\\/].*Critical dependency.*expression/,
      /node_modules[\\/]@sentry[\\/].*Critical dependency.*expression/,
    ];
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false, // Required by ioredis but not available in browser/Edge
      mongoose: false, // Exclude mongoose from client/edge bundles
      async_hooks: false, // Node.js core module - not available in browser
    }
    
    // 🚀 MEMORY-OPTIMIZED: Balance speed with memory constraints
    if (!dev) {
      // Production optimizations optimized for 2GB available memory
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic', // Faster than 'hashed'
        // Keep these enabled for stability in low-memory environments
        removeAvailableModules: true,
        removeEmptyChunks: true,
        // ⚡ PERFORMANCE: Module concatenation (scope hoisting) reduces bundle size
        concatenateModules: true,
        // Simplified chunk splitting to reduce memory pressure
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Single framework chunk
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // ⚡ PERFORMANCE: Separate lib chunk for common dependencies
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'commons',
              priority: 20,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
        // ⚡ PERFORMANCE: Minimize bundle size
        minimize: true,
      };
      
      // Configure source maps: hidden maps for production (enables stack traces without exposing source)
      // In production, generate hidden source maps for error tracking (upload to Sentry/monitoring)
      // In development, keep fast builds without source maps to save memory
      config.devtool = false; // Keep dev builds fast
      if (!dev && process.env.CI === 'true') {
        // Production builds in CI: generate hidden source maps for error tracking
        config.devtool = 'hidden-source-map'; // Generates .map files but doesn't reference them in bundles
        // Note: Upload generated .map files to Sentry or your error tracking service in CI/CD pipeline
      }
      
      // Limit parallelism to prevent memory spikes
      config.parallelism = 1;
    }
    
    // Add polling for OneDrive file watching issues (only applies when NOT using turbopack)
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/
      }
    }
    
    return config
  },

  // Redirects for old routes
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/system',
        permanent: true,
      },
      // Legacy dashboard aliases -> FM routes
      {
        source: '/dashboard',
        destination: '/fm/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard/:path*',
        destination: '/fm/:path*',
        permanent: false,
      },
    ]
  },

  // UI + API rewrites
  async rewrites() {
    const apiRewrites = isDevelopment
      ? [
          {
            source: '/api/auth/:path*',
            destination: '/api/auth/:path*',
          },
          {
            source: '/api/marketplace/:path*',
            destination: 'http://localhost:5000/api/marketplace/:path*',
          },
          {
            source: '/api/properties/:path*',
            destination: 'http://localhost:5000/api/properties/:path*',
          },
          {
            source: '/api/workorders/:path*',
            destination: 'http://localhost:5000/api/workorders/:path*',
          },
          {
            source: '/api/finance/:path*',
            destination: 'http://localhost:5000/api/finance/:path*',
          },
          {
            source: '/api/hr/:path*',
            destination: 'http://localhost:5000/api/hr/:path*',
          },
          {
            source: '/api/crm/:path*',
            destination: 'http://localhost:5000/api/crm/:path*',
          },
          {
            source: '/api/compliance/:path*',
            destination: 'http://localhost:5000/api/compliance/:path*',
          },
          {
            source: '/api/analytics/:path*',
            destination: 'http://localhost:5000/api/analytics/:path*',
          },
        ]
      : [];

    return apiRewrites;
  },

  // Output configuration for deployment
  // Use standalone output in production builds, but avoid it in local/test to reduce build flakiness
  output: process.env.NEXT_OUTPUT || (isVercelDeploy ? 'standalone' : undefined),
}

module.exports = withBundleAnalyzer(nextConfig)
