/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly tell Next.js to use app directory and ignore src/pages
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Image optimization with modern formats
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Compression
  compress: true,
  // Power optimization features
  poweredByHeader: false,
  // Output optimization
  output: 'standalone',
  // Experimental features for Next.js 16
  experimental: {
    optimizeCss: true,
  },
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {
    // Turbopack handles optimizations automatically
    // Ignore legacy directories
    resolveAlias: {
      // Add any alias configurations if needed
    },
  },
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },
  // Redirects for performance (if needed)
  async redirects() {
    return []
  },
}

module.exports = nextConfig

