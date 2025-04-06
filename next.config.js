/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "www.flaticon.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for dynamic imports in keyv
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
    };

    // Ignore adapter resolution errors - we've installed the required adapters
    config.ignoreWarnings = [
      { module: /node_modules\/keyv\/src\/index\.js/ },
      { module: /node_modules\/cacheable-request\/src/ },
    ];

    return config;
  },
};

export default config;
