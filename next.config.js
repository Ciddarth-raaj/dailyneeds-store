module.exports = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for @imgly/background-removal WASM files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Handle WASM files - treat them as static assets (not parsed)
      // This prevents webpack from trying to parse WASM files as JavaScript
      // Must be added BEFORE other rules to take precedence
      config.module.rules.unshift({
        test: /\.wasm$/,
        type: "asset/resource",
        generator: {
          filename: "static/wasm/[name][ext]",
        },
      });
    }

    return config;
  },
};
