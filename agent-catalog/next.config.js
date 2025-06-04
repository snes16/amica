const fs = require('fs');
const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
  },
  webpack: (config, { webpack, buildId }) => {
      // See https://webpack.js.org/configuration/resolve/#resolvealias
      config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
      }
  
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm-threaded.wasm",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm.wasm",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "./node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
              to: "static/chunks/[name][ext]",
            },
            {
              from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
              to: "static/chunks/[name][ext]",
            },
          ],
        })
      );
  
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NEXT_PUBLIC_CONFIG_BUILD_ID': JSON.stringify(buildId)
        })
      );
  
      return config;
    },
};

// Try to require user config if it exists
let userConfig;
const userConfigPath = path.resolve(__dirname, './v0-user-next.config.js');

if (fs.existsSync(userConfigPath)) {
  try {
    userConfig = require(userConfigPath);
  } catch (e) {
    console.warn('Failed to load v0-user-next.config.js:', e.message);
  }
}

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) return;

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

module.exports = withPWA(nextConfig);
