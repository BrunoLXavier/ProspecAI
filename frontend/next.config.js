/** @type {import('next').NextConfig} */
// Server-side API URL for rewrites (uses Docker service name inside container)
const API_URL_SERVER = process.env.API_URL_SERVER || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Client-side API URL (uses localhost for browser access)
const API_URL_CLIENT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // i18n is handled by next-intl provider, not next.config.js in App Router
  env: {
    NEXT_PUBLIC_API_URL: API_URL_CLIENT,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL_SERVER}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
