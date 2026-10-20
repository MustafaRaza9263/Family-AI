import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Dev uses rewrites so the browser can call /api on :3000 while Express
 * listens on :4000. Static export cannot use rewrites, so production builds
 * drop them and rely on Express serving out/ on the same origin.
 */
const nextConfig: NextConfig = {
  // Hostname only (no scheme/port). Needed when opening next dev via LAN mDNS.
  allowedDevOrigins: ["spark-beee.local"],
  ...(isDev
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:4000/api/:path*",
            },
          ];
        },
      }
    : {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
      }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
