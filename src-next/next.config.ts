import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  // Public pages from SMS links (batch 9 rule 9): never cached, never indexed. The token is in the query string.
  async headers() {
    const h = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/parent-reports", headers: h },
      { source: "/link-expired", headers: h },
      { source: "/link-invalid", headers: h },
    ];
  },
  experimental: {
    // Two root layouts, (student) and (exam), so unmatched URLs use app/global-not-found.tsx
    globalNotFound: true,
  },
};

export default nextConfig;
