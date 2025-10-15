/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig = {
  // App Router is enabled by default in Next.js 14
  // No need for experimental.appDir anymore
  
  // Fix CORS warnings from error report
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? '*' 
              : 'https://fixzit.co'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Cookie'
          },
        ],
      },
    ]
  },

  // Image optimization for marketplace and property images
  images: {
    domains: [
      'localhost',
      'fixzit.co',
      'res.cloudinary.com',
      'amazonaws.com',
      'googleusercontent.com',
      'ui-avatars.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables (non-sensitive)
  env: {
    NEXT_PUBLIC_APP_NAME: 'FIXZIT SOUQ Enterprise',
    NEXT_PUBLIC_VERSION: '2.0.26',
    NEXT_PUBLIC_DEFAULT_LOCALE: 'ar',
    NEXT_PUBLIC_CURRENCY: 'SAR',
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Experimental optimizations for CI/CD stability
  experimental: {
    // Reduce worker threads for CI stability - prevents SIGTERM during type checking
    workerThreads: false,
    cpus: 1
  },

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json'
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Webpack customization for module resolution and OneDrive compatibility
  webpack: (config, { isServer, dev }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    // Add polling for OneDrive file watching issues
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

  // API Rewrites to backend server
  async rewrites() {
    if (!isDevelopment) {
      // Avoid rewriting API requests to localhost when running in production
      // (e.g. on Vercel) where the backend is not available.
      return [];
    }

    return [
      // Ensure auth API routes are handled first
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
  },

  // Output configuration for deployment
  output: 'standalone',
}

module.exports = nextConfig
