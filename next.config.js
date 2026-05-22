/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/admin/leaves/senior-teacher",
        destination: "/admin/leaves",
        permanent: false,
      },
      {
        source: "/admin/leaves/senior-teacher/:path*",
        destination: "/admin/leaves",
        permanent: false,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Cold / on-demand compilation can exceed the default chunk load timeout in dev (ChunkLoadError on app/layout.js).
  webpack: (config, { dev, isServer }) => {
    config.output = config.output || {};

    if (isServer) {
      // Ensure server async chunks load from the server/chunks directory.
      config.output.chunkFilename = "chunks/[id].js";
    }

    if (dev) {
      config.output.chunkLoadTimeout = 300000; // 5 minutes (default is often 120s)
    }

    return config;
  },
};

module.exports = nextConfig;
