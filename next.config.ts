import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  logging: { incomingRequests: false },
  turbopack: { root: process.cwd() }
};

export default nextConfig;
