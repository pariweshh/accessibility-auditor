import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  serverExternalPackages: ["chrome-aws-lambda"],
}

export default nextConfig
