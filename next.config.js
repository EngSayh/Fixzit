/** @type {import('next').NextConfig} */
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
              : 'https://fixzit.com'
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
      'fixzit.com',
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
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Webpack customization for module resolution
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
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

  // Output configuration for deployment
  output: 'standalone',
}

module.exports = nextConfig