import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
