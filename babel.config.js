/**
 * babel.config.js
 *
 * Expo + Hermes preset. inline-requires is handled by Metro (metro.config.js),
 * but babel-plugin-transform-inline-environment-variables is used to replace
 * EXPO_PUBLIC_* vars at build time so the bundle stays minimal.
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Replace process.env.EXPO_PUBLIC_* at bundle time
      "transform-inline-environment-variables",
      // Optional: reanimated — only include if reanimated is added later
      // 'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Strip prop-types in production builds — saves ~5 KB per component
          "transform-react-remove-prop-types",
        ],
      },
    },
  };
};
