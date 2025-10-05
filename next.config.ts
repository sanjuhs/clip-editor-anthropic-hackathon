import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Externalize sharp and moondream to prevent bundling native binaries
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("sharp", "moondream");
    }
    return config;
  },
  // Suppress the workspace root warning
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
