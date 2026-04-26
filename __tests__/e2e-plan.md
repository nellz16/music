# E2E Test Plan — Expo Music Player

## Prerequisites
- Android device or emulator (API 21+) connected via ADB
- App built in preview mode: `eas build --platform android --profile preview`
- APK installed: `adb install -r ./build/*.apk`

---

## Test Suite 1: Cold Start Performance

**Objective:** Verify app starts within 3 seconds on low-end device.

Steps:
1. `adb shell am force-stop com.yourcompany.expomusic`
2. `adb shell am start-activity -W com.yourcompany.expomusic/.MainActivity`
3. Observe "Displayed" time in adb output.

**Pass:** Displayed time < 3000ms
**Fail:** Displayed time >= 3000ms or crash

---

## Test Suite 2: Track List Navigation

**Objective:** Verify the playlist loads and scrolls without jank.

Steps:
1. Launch app.
2. Wait for track list to appear (max 5 seconds).
3. Scroll to bottom of list.
4. Scroll back to top.
5. Tap a track.

**Pass:** No ANR dialog; tracks render; tap responds within 300ms.

---

## Test Suite 3: Start Playback

**Objective:** Verify audio starts playing after tapping a track.

Steps:
1. Tap the first track in the list.
2. Observe mini-player bar appears.
3. Tap the bar to open full player.
4. Observe progress bar advancing.
5. Tap pause; audio should stop.

**Pass:**
- Mini-player appears within 2 seconds of tap.
- Progress bar advances smoothly.
- Pause stops playback.

---

## Test Suite 4: Seek Performance (Range Requests)

**Objective:** Verify seeking works and Range requests are used.

Steps:
1. Start playback on a track where `supportsRange: true`.
2. Open full player.
3. Drag seek bar to 50% position.
4. Wait up to 3 seconds.
5. Observe playback resumes near the target position.

**Pass:** Playback resumes within 3 seconds; position is within ±2 seconds of target.

Optional ADB validation:
```
adb logcat | grep "Range" | head -5
```
Expect to see `206 Partial Content` in logs if Range is supported.

---

## Test Suite 5: Low-End Mode Toggle

**Objective:** Verify low-end mode disables animations and reduces settings.

Steps:
1. Open Settings (⚙ icon).
2. Toggle "Low-End Mode" on.
3. Go back to track list.
4. Observe:
   - "LOW-END" badge appears in header.
   - Track list items have no cover art images.
5. Start playback; open full player.
6. Observe cover art is replaced by placeholder.

**Pass:** All visual changes apply within 1 frame of toggle.

---

## Test Suite 6: Memory Smoke Check

**Objective:** Verify app stays under 150 MB PSS after 10 minutes of playback.

Steps:
1. Start playback.
2. Navigate between screens several times.
3. Let playback continue for 10 minutes.
4. Run: `adb shell dumpsys meminfo com.yourcompany.expomusic`
5. Note "TOTAL PSS" value.

**Pass:** TOTAL PSS < 150 MB
**Warning:** 150–200 MB
**Fail:** > 200 MB

---

## Test Suite 7: Offline / Cache

**Objective:** Verify recently played tracks play from cache.

Steps:
1. Play a track to completion (or wait for partial download).
2. Enable airplane mode on device.
3. Tap the same track again.
4. Observe: "CACHED" badge shown on player screen; playback starts immediately.

**Pass:** Playback starts within 1 second with no network.

---

## Detox Integration (Optional)

For automated E2E, install Detox:
```
npm install detox --save-dev
npx detox init
```

Map the above test cases to Detox actions using:
- `device.launchApp()`
- `element(by.text("Track 1")).tap()`
- `element(by.id("seek-bar")).swipe("right", "fast", 0.5)`
- `expect(element(by.text("CACHED"))).toBeVisible()`
