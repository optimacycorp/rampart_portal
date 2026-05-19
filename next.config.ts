import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb"
    }
  },
  outputFileTracingRoot: path.join(__dirname)
};

export default nextConfig;
