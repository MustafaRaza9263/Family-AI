import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Dev rewrites same-origin /api to Express :4001. Static export cannot use
 * rewrites, so production drops them and Express serves out/ on one origin.
 * compress:false keeps SSE from being buffered by Next in development.
 */
const nextConfig: NextConfig = {
  transpilePackages: ['@studio/shared'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  ...(isDev
    ? {
        compress: false,
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'http://127.0.0.1:4001/api/:path*',
            },
          ];
        },
      }
    : {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
      }),
};

export default nextConfig;
