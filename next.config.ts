import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  },
  outputFileTracingRoot: path.join(__dirname)
};

export default nextConfig;
