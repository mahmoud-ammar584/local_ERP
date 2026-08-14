/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  async rewrites() {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection',       value: '1; mode=block' },
      ],
    }]
  },
  images: { formats: ['image/avif', 'image/webp'] },
}

module.exports = nextConfig
