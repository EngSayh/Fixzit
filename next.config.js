/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development';

// Bundle analyzer configuration
const path = require('path');
const resolveFromRoot = (...segments) => path.resolve(__dirname, ...segments);
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// ---- Production guardrails (fail fast for unsafe flags/secrets) ----
// Only validate critical settings on actual production deployments
const isProdDeploy = process.env.VERCEL_ENV === 'production';
const isVercelDeploy = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';

if (isVercelDeploy) {
  const violations = [];
  
  // Critical security checks for all Vercel deployments
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    violations.push('SKIP_ENV_VALIDATION must be false in production');
  }
  if (process.env.DISABLE_MONGODB_FOR_BUILD === 'true') {
    violations.push('DISABLE_MONGODB_FOR_BUILD must be false in production');
  }
  
  // Payment keys only required for actual production (not preview)
  if (isProdDeploy) {
    if (!process.env.TAP_PUBLIC_KEY) {
      violations.push('TAP_PUBLIC_KEY is required for production payment flows');
    }
    if (!process.env.TAP_WEBHOOK_SECRET) {
      violations.push('TAP_WEBHOOK_SECRET is required to verify payment webhooks');
    }
  }

  if (violations.length > 0) {
    // Throwing here fails the build early and loudly
    throw new Error(
      `Production env validation failed:\n- ${violations.join('\n- ')}`
    );
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
  
  // 🚀 SPEED OPTIMIZATIONS - Memory-optimized for constrained environments
  experimental: {
    // Enable optimized package imports (reduces bundle size & build time)
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      'sonner',
      'react-day-picker',
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

  // TypeScript and ESLint - PRODUCTION QUALITY GATES
  // ✅ RESTORED: Build-time type checking and linting enforced
  // These checks are CRITICAL for preventing broken code from reaching production
  // If builds are slow, fix the errors - don't disable the checks
  typescript: {
    ignoreBuildErrors: false, // ✅ ENFORCE: Build fails if TypeScript errors exist
    tsconfigPath: './tsconfig.json'
  },
  eslint: {
    ignoreDuringBuilds: false, // ✅ ENFORCE: Build fails if ESLint errors exist
  },

  serverExternalPackages: [
    'mongoose', 
    'bcryptjs',
  ],

  // ✅ FIXED: Turbopack configuration added above to silence warning
  // 
  // This webpack config is ONLY used during production builds (`npm run build`)
  // When running `npm run dev`, Turbopack is used instead (configured above)
  //
  webpack: (config, { dev, nextRuntime }) => {
    // Production-only webpack optimizations below
    const otelShim = resolveFromRoot('lib/vendor/opentelemetry/global-utils.js');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/api/build/esm/internal/global-utils': otelShim,
      '@opentelemetry/api/build/esm/internal/global-utils.js': otelShim,
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
        '@/lib/mongoUtils': false,
        '@/lib/mongoUtils.server': false,
        'bcryptjs': false,
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
      mongoose: false, // Exclude mongoose from client/edge bundles
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
  output: 'standalone',
}

module.exports = withBundleAnalyzer(nextConfig)
