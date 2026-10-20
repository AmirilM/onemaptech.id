import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      { source: "/daily", destination: "/daily/summary", permanent: true },
      {
        source: "/products",
        destination: "/products/devices",
        permanent: true,
      },
      { source: "/report", destination: "/report/raw", permanent: true },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
