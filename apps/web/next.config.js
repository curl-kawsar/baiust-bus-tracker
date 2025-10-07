/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@bus-tracker/ui'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? '/api/:path*'  // In production, use Vercel's API routes
          : 'http://localhost:3001/proxy/:path*'  // In development, use local backend
      }
    ];
  },
  // Vercel deployment configuration
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.cwd()
  }
};

module.exports = nextConfig;
