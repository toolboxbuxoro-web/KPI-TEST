import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  turbopack: {
    // Fix monorepo/multiple-lockfile warning by explicitly setting the project root
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
