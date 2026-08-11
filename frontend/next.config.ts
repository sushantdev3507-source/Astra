import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // html-tool/ lives outside frontend/ (see repo architecture: engine
  // code is framework-agnostic and shared conceptually across the
  // whole Astra project, not just this Next.js app). This allows
  // frontend/lib/canvas-engine to import it via a relative path.
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
