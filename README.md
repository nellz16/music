# Expo Music Player

A minimal, high-performance music streaming app for **low-end Android devices** ("kentang" / potato phones). Built with Expo SDK 53, expo-av, and Zustand. Produces an installable APK via EAS Build.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your API and CDN URLs

# 3. Run in Expo Go (development)
npm start

# 4. Run on Android device/emulator
npm run android
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.example.com` |
| `EXPO_PUBLIC_CDN_URL` | CDN base URL for audio | `https://cdn.example.com` |

**For local dev:** Set in `.env` (never commit this file).

**For EAS builds:**
```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment production
eas env:create --name EXPO_PUBLIC_CDN_URL  --value https://cdn.example.com  --environment production
```

**Secret values** (signing keys, database URLs, R2 credentials) must be set via the EAS dashboard or `eas secret:create`. They are **never** embedded in the client bundle.

---

## Building an APK

### Prerequisites

```bash
npm install -g eas-cli
eas login
eas init   # links your project — fills eas.projectId in app.config.js
```

### Preview APK (unsigned, sideloadable)

```bash
# Build on EAS servers
npm run build:apk:preview

# Or build locally (requires Android SDK)
npm run build:apk:local
```

### Production APK (signed)

```bash
# First, configure your keystore:
eas credentials

# Then build:
npm run build:apk:production
```

### Download the APK

After the build completes, EAS prints a download URL. Or:

```bash
eas build:list --platform android
```

### Install to device via ADB

```bash
adb install -r ./your-build.apk
```

---

## Run Tests

```bash
# Unit tests (Jest)
npm test

# With coverage report
npm run test:coverage
```

---

## Image Optimization

```bash
# Requires: npm install --save-dev sharp (already in devDependencies)
npm run optimize:images
```

Reads from `assets/images/`, generates 1x/2x/3x variants, and writes to `assets/images/optimized/`. Replace bundled assets before production builds.

---

## Network Simulation (k6)

```bash
# Install k6: https://k6.io/docs/get-started/installation/
k6 run -e API_URL=https://api.example.com scripts/k6-network-sim.js
```

Simulates 10 concurrent clients on poor network. Tests track list, Range seek, and upload token endpoints.

---

## Device Diagnostics

With device connected via USB:

```bash
chmod +x scripts/diagnostic.sh
./scripts/diagnostic.sh
```

Outputs: memory PSS, frame timing, crash logs.

Manual commands:

```bash
# Memory usage
adb shell dumpsys meminfo com.yourcompany.expomusic

# GPU frame timing
adb shell dumpsys gfxinfo com.yourcompany.expomusic

# Logcat (filter for errors)
adb logcat -s ReactNativeJS AndroidRuntime
```

---

## Performance Architecture

| Feature | Implementation |
|---|---|
| JS Engine | Hermes (faster startup, lower memory) |
| Code minification | ProGuard/R8 + Terser |
| Lazy module loading | Metro `inlineRequires: true` |
| List rendering | FlatList + `getItemLayout` + `removeClippedSubviews` |
| Audio streaming | expo-av + HTTP Range requests (206 Partial Content) |
| Seek without re-download | `Sound.setPositionAsync()` → native Range request |
| Offline cache | LRU via expo-file-system + AsyncStorage index |
| Low-End Mode | Reduced bitrate, no animations, smaller cache, mono downmix |
| Bundle size | Minimal deps: no Redux, no heavy UI lib, no Reanimated |
| Image loading | expo-image with `cachePolicy="disk"` |
| State management | Zustand (~1.2 KB gzip) |

---

## Low-End Mode

Toggle in **Settings → Low-End Mode**. When enabled:

- Audio bitrate: 64 kbps (vs 128 kbps)
- Cache limit: 30 MB (vs 100 MB)
- FlatList window: 2 screens (vs 5)
- No list animations
- No waveform visualizer
- Cover art hidden in track list
- Mono downmix enabled (reduces decode CPU)
- Prebuffer: 1500 ms (vs 5000 ms)

---

## Project Structure

```
expo-music-player/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (audio init, PlayerBar)
│   ├── index.tsx           # Track list (FlatList, optimized)
│   ├── player.tsx          # Full player (seek, cover, controls)
│   ├── settings.tsx        # Low-end mode toggle, cache stats
│   └── upload.tsx          # Upload flow
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── TrackRow.tsx    # Memoized list row (fixed height)
│   │   ├── PlayerBar.tsx   # Persistent mini-player
│   │   └── SeekBar.tsx     # PanResponder seek bar
│   ├── config/
│   │   ├── env.ts          # Environment variable access
│   │   ├── player.ts       # Normal / Low-End profiles
│   │   └── theme.ts        # Design tokens (colors, spacing)
│   ├── hooks/
│   │   ├── usePlayback.ts  # Bridges store ↔ streamPlayer
│   │   └── useTracks.ts    # Fetches track list from API
│   ├── modules/
│   │   ├── audioCache.ts   # LRU file cache (expo-file-system)
│   │   ├── streamPlayer.ts # expo-av + Range streaming
│   │   └── uploadHelper.ts # Token-gated upload flow
│   ├── store/
│   │   └── playerStore.ts  # Zustand global state
│   └── utils/
│       ├── format.ts       # Pure formatting helpers
│       └── types.ts        # Shared TypeScript types
├── __tests__/              # Jest unit tests + E2E plan
├── scripts/
│   ├── optimize-images.js  # sharp-based image optimizer
│   ├── k6-network-sim.js   # k6 network stress test
│   └── diagnostic.sh       # ADB memory/FPS diagnostics
├── app.config.js           # Expo + Android config
├── eas.json                # EAS build profiles
├── metro.config.js         # Metro + inlineRequires
├── babel.config.js         # Babel preset
└── .env.example            # Environment variable template
```

---

## Backend Placeholders

The app expects the following API contract. Implement server-side as needed:

### `GET /tracks`
Returns array of `Track` objects:
```json
[{
  "id": "string",
  "title": "string",
  "artist": "string",
  "duration": 240,
  "streamUrl": "https://cdn.example.com/audio/id.mp3",
  "streamUrlLow": "https://cdn.example.com/audio/id-64k.mp3",
  "coverUrl": "https://cdn.example.com/covers/id.jpg",
  "fileSizeBytes": 5000000,
  "supportsRange": true
}]
```

### `POST /upload/token`
Request: `{ filename, mimeType, sizeBytes }`
Response: `{ uploadId, uploadUrl, expiresAt }`

The `uploadUrl` should be a short-lived signed URL (e.g. R2 presigned, S3 presigned). The client PUTs the binary file directly to `uploadUrl`.

---

## Troubleshooting

**App crashes on very old Android (API 21–23):**
- Ensure `minSdkVersion: 21` in `app.config.js`
- Enable multidex: `enableMultiDex: true` in build-properties plugin

**High memory usage (>200 MB):**
- Enable Low-End Mode in Settings
- Reduce `NORMAL_PROFILE.cacheLimitBytes` in `src/config/player.ts`
- Check for memory leaks with: `adb shell dumpsys meminfo com.yourcompany.expomusic`

**Playback stutters on poor network:**
- Enable Low-End Mode (reduces bitrate to 64 kbps)
- Verify backend CDN supports `Accept-Ranges: bytes`
- Increase `RANGE_REQUEST_TIMEOUT_MS` in `src/config/player.ts`

**Expo Go crash (development):**
- Hermes is disabled in Expo Go dev builds — this is expected
- For full Hermes testing use a development build: `eas build --profile development`

**Build fails with `AAPT error: resource not found`:**
- Ensure icon and splash images exist in `assets/images/`
- Run `npm run optimize:images` to generate them
- Check `app.config.js` icon paths

**Disable development menu in production:**
EAS release builds automatically strip the dev menu. Ensure you are not using `developmentClient: true` in the `production` EAS profile.

**Strip console.log from production bundle:**
Already configured in `metro.config.js` via `minifierConfig.compress.drop_console: true`.
