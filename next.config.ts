import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1:43123", "localhost:43123"],
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
