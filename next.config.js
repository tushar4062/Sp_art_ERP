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

    if (dev) {
      config.output.chunkLoadTimeout = 300000; // 5 minutes (default is often 120s)
    }

    if (isServer) {
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = async (context, request, callback) => {
          if (request === 'pdfkit') {
            return callback(null, 'commonjs pdfkit');
          }
          return originalExternals(context, request, callback);
        };
      } else {
        config.externals = config.externals || [];
        config.externals.push('pdfkit');
      }
    }

    return config;
  },
};

module.exports = nextConfig;
