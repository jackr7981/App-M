import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Required for Capacitor (Static Site Generation)
  trailingSlash: true, // Recommended for Capacitor to ensure standard folder/index.html structure
  images: {
    unoptimized: true, // Next.js Image Optimization doesn't work with 'export'
  },
};

export default nextConfig;
