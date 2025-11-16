// next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: process.env.CI !== 'true',
});

const isDev = process.env.NODE_ENV !== 'production';
const isCI = process.env.CI === 'true';

// API base: Custom env for flexibility (staging/prod), dev fallback
const API_BASE_URL = process.env.FIXZIT_API_BASE ?? (isDev ? 'http://localhost:5000' : 'https://api.fixzit.co');

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,

  // Hidden maps via webpack for Sentry (CI upload .map files)
  productionBrowserSourceMaps: false,

  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
    localeDetection: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'fixzit.co' },
      { protocol: 'https', hostname: 'www.fixzit.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Exact S3 bucket for security - replace with your actual bucket name
      { protocol: 'https', hostname: 'fixzit-bucket.s3.eu-central-1.amazonaws.com' },
      { protocol: 'https', hostname: '**.s3.eu-central-1.amazonaws.com' }, // Wildcard for bucket variations
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  env: {
    NEXT_PUBLIC_APP_NAME: 'FIXZIT SOUQ Enterprise',
    NEXT_PUBLIC_VERSION: '2.0.27',
    NEXT_PUBLIC_DEFAULT_LOCALE: 'ar',
    NEXT_PUBLIC_CURRENCY: 'SAR',
    NEXT_PUBLIC_API_BASE: API_BASE_URL,
    NEXT_PUBLIC_PRIMARY_COLOR: '#0061A8', // From PDF design system
  },

  staticPageGenerationTimeout: 180,
  cleanDistDir: true,

  typescript: { ignoreBuildErrors: false, tsconfigPath: './tsconfig.json' },
  eslint: { ignoreDuringBuilds: false },

  // Caching only; CORS/security/CSP handled in runtime (server/security/headers.ts)
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }
        ]
      },
    ];
  },

  async redirects() {
    return [
      { source: '/admin', destination: '/system', permanent: true }
    ];
  },

  async rewrites() {
    if (!isDev) return [];
    return [
      { source: '/api/auth/:path*', destination: '/api/auth/:path*' }, // Keep local
      { source: '/api/marketplace/:path*', destination: `${API_BASE_URL}/api/marketplace/:path*` },
      { source: '/api/properties/:path*', destination: `${API_BASE_URL}/api/properties/:path*` },
      { source: '/api/workorders/:path*', destination: `${API_BASE_URL}/api/workorders/:path*` },
      { source: '/api/finance/:path*', destination: `${API_BASE_URL}/api/finance/:path*` },
      { source: '/api/hr/:path*', destination: `${API_BASE_URL}/api/hr/:path*` },
      { source: '/api/crm/:path*', destination: `${API_BASE_URL}/api/crm/:path*` },
      { source: '/api/compliance/:path*', destination: `${API_BASE_URL}/api/compliance/:path*` },
      { source: '/api/analytics/:path*', destination: `${API_BASE_URL}/api/analytics/:path*` },
    ];
  },

  output: 'standalone',

  experimental: {
    // UI libs per blueprints/screenshots (Monday-inspired dashboard)
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      'sonner',
      'react-day-picker'
    ],
  },

  // Exclude from bundling (Mongo/RBAC safe)
  serverExternalPackages: ['mongoose', 'bcryptjs'],

  webpack: (config, { dev, nextRuntime, isServer }) => {
    // Prevent client/edge bundles from pulling Node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };

    // Avoid bundling certain modules in Edge runtime
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        mongoose: false,
        bcryptjs: false,
        '@/server/models/User': false,
        '@/lib/mongoUtils': false,
        '@/lib/mongoUtils.server': false,
      };
    }

    // Fallback externals if serverExternalPackages unsupported (older Next versions)
    if (isServer) {
      config.externals = [...(config.externals || []), 'mongoose', 'bcryptjs'];
    }

    // Production optimizations
    if (!dev) {
      // Hidden source maps for Sentry
      config.devtool = 'hidden-source-map';

      // Memory-optimized chunk splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        removeAvailableModules: true,
        removeEmptyChunks: true,
        concatenateModules: true,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'commons',
              priority: 20,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Conditional parallelism for Cursor/Codespaces low-RAM environments
    if (isCI || isDev) {
      config.parallelism = 1;
    }

    // File watching for dev (OneDrive compatibility)
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/
      };
    }

    return config;
  },
};

export default withBundleAnalyzer(config);
