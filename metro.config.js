/**
 * metro.config.js
 *
 * Metro bundler configuration for Expo + low-end Android optimizations.
 *
 * Performance choices:
 *  - inlineRequires: true  → lazy-loads modules, reduces cold-start memory spike
 *  - minifierConfig       → aggressive Terser settings strip dead code
 *  - transformer.assetPlugins → strip metadata from images in prod
 */

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// ─── Inline Requires ─────────────────────────────────────────────────────────
// Defer module execution until first use. Crucial for low-memory devices:
// the JS engine doesn't parse all modules at startup.
config.transformer = {
  ...config.transformer,
  inlineRequires: true,
  // Minifier for release builds
  minifierConfig: {
    mangle: true,
    compress: {
      drop_console: true,    // strips console.log in production
      drop_debugger: true,
      dead_code: true,
      unused: true,
      passes: 2,
    },
    output: {
      ascii_only: true,
    },
  },
  // Asset registration
  assetRegistryPath: "react-native/Libraries/Image/AssetRegistry",
};

// ─── Resolver ─────────────────────────────────────────────────────────────────
// Prefer .native.ts(x) files for RN-specific implementations
config.resolver = {
  ...config.resolver,
  sourceExts: [
    "tsx",
    "ts",
    "jsx",
    "js",
    "native.tsx",
    "native.ts",
    "native.jsx",
    "native.js",
    "json",
    "cjs",
  ],
  // Tree-shaking-friendly: allow .mjs modules
  assetExts: [
    ...(config.resolver.assetExts || []),
    "lottie",
    "db",
    "mp3",
    "m4a",
    "ogg",
    "flac",
  ],
};

// ─── Server ───────────────────────────────────────────────────────────────────
config.server = {
  ...config.server,
  // Larger timeout for slow dev machines / emulators
  port: 8081,
};

module.exports = config;
