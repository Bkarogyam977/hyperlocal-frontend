import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://hyper-api.arogyamission.com/:path*',
      },
    ];
  },
};

export default nextConfig;