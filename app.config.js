/**
 * app.config.js — Expo app configuration for low-end Android APK builds.
 *
 * All sensitive values (EXPO_PUBLIC_API_URL, etc.) come from EAS secrets
 * or a local .env file. Never hard-code real credentials here.
 *
 * See README.md § Environment Variables for the full list.
 */

export default ({ config }) => ({
  ...config,
  name: "MusicPlayer",
  slug: "expo-music-player",
  version: "1.0.0",
  runtimeVersion: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "dark",
  // Splash screen — dark background for perceived speed on slow devices
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  // Only request permissions we actually need
  android: {
    package: "com.yourcompany.expomusic", // PLACEHOLDER — change before publishing
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0a0a0a",
    },
    // Minimum SDK 21 supports ~97% of active Android devices
    minSdkVersion: 21,
    targetSdkVersion: 34,
    compileSdkVersion: 34,
    // Permissions: minimal set for music streaming
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.WAKE_LOCK",
    ],
    // Enable Hermes JS engine — smaller bundle, faster startup, lower memory
    jsEngine: "hermes",
    // ProGuard / R8 minification reduces APK size and improves load time
    enableProguardInReleaseBuilds: true,
    // Resource shrinking removes unused Android resources
    shrinkResources: true,
    // ABI splits: produce smaller per-device APKs
    // arm64-v8a covers modern low-end; armeabi-v7a covers very old devices
    abiSplits: ["armeabi-v7a", "arm64-v8a"],
    // Gradle memory settings for the build machine (not the device)
    gradle: {
      // These are applied in android/gradle.properties
      properties: {
        "android.enableR8.fullMode": "true",
        "android.useAndroidX": "true",
        "android.enableJetifier": "true",
        // Increase Gradle daemon heap for complex builds
        "org.gradle.jvmargs": "-Xmx4096m -XX:MaxPermSize=1024m",
      },
    },
    // Background playback service
    intentFilters: [
      {
        action: "android.intent.action.MAIN",
        category: ["android.intent.category.LAUNCHER"],
      },
    ],
  },
  // Public environment variables — non-secret config only.
  // Secrets go in EAS environment variables (eas.json / EAS dashboard).
  extra: {
    // PLACEHOLDER — set EXPO_PUBLIC_API_URL in .env or EAS secrets
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com",
    // PLACEHOLDER — set EXPO_PUBLIC_CDN_URL in .env or EAS secrets
    cdnUrl: process.env.EXPO_PUBLIC_CDN_URL ?? "https://cdn.example.com",
    eas: {
      projectId: "YOUR_EAS_PROJECT_ID", // PLACEHOLDER — run `eas init` to fill
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-av",
      {
        microphonePermission: false, // we do not need microphone
      },
    ],
    "expo-splash-screen",
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 21,
          targetSdkVersion: 34,
          compileSdkVersion: 34,
          buildToolsVersion: "34.0.0",
          // Enable multidex for large apps; helps on older devices
          enableMultiDex: true,
        },
      },
    ],
  ],
  scheme: "expomusic",
  experiments: {
    typedRoutes: true,
  },
});
