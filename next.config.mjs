/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
  // Prevent webpack from trying to bundle native Remotion binaries
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "remotion",
    "@rspack/core",
    "@rspack/binding",
    "esbuild",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize all remotion/rspack packages at the webpack level too
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...externals,
        "@remotion/bundler",
        "@remotion/renderer",
        "@remotion/cli",
        "remotion",
        "@rspack/core",
        "@rspack/binding",
        "esbuild",
      ];
    }
    return config;
  },
};

export default nextConfig;
