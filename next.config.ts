import type { NextConfig } from "next";
import path from "node:path";

// next/image refuses any host that is not declared here, so the bucket serving
// the album has to be allow-listed. R2's default public hostnames live under
// r2.dev; a custom domain set via MEDIA_BASE_URL is picked up from the env so
// pointing the album at one does not need a config edit.
function mediaHostPattern() {
  const base = process.env.MEDIA_BASE_URL;
  if (!base) return [];
  try {
    return [{ protocol: "https" as const, hostname: new URL(base).hostname, pathname: "/**" }];
  } catch {
    console.warn(`[next.config] MEDIA_BASE_URL is not a valid URL: ${base}`);
    return [];
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      ...mediaHostPattern(),
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
