import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // pdfmake se nemá bundlovat – spouští se ze serverového node_modules (generování PDF faktury)
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
