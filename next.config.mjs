/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@remotion/renderer", "edge-tts"],
  },
};

export default nextConfig;
