import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  experimental: {
    // Two root layouts, (student) and (exam), so unmatched URLs use app/global-not-found.tsx
    globalNotFound: true,
  },
};

export default nextConfig;
