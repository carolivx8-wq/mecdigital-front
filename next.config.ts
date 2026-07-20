import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  logging: { incomingRequests: false },
  turbopack: { root: process.cwd() },
  headers: async () => [{
    source: "/registro/compartilhado",
    headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" }
    ]
  }]
};

export default nextConfig;
