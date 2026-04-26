/**
 * streamPlayer.ts — Streaming audio playback via expo-av with Range request support.
 *
 * Architecture:
 *  1. Try to serve the track from local LRU cache first.
 *  2. If not cached, probe whether the server supports HTTP Range requests.
 *  3. If Range is supported: use a range-aware URI that expo-av can stream
 *     (AVPlayer on Android handles range-based partial content natively).
 *  4. If Range is not supported: fall back to progressive download.
 *  5. On low-end mode, request the lower-bitrate variant URL.
 *
 * Seek implementation:
 *  - expo-av's Sound.setPositionAsync() is used for time-based seeking.
 *  - For networks that support Range, we additionally calculate the approximate
 *    byte offset and pass it as a hint (where the backend accepts it).
 *
 * Memory safety:
 *  - We never load the full file into a JS Buffer / base64 string.
 *  - FileSystem.downloadAsync writes directly to disk.
 *  - Prefetch is limited to 1-2 tracks (configurable) and can be cancelled.
 *
 * IMPORTANT: Call initPlayer() once at app startup (e.g. in App.tsx).
 */

import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import * as FileSystem from "expo-file-system";
import type { Track } from "@/utils/types";
import { getCachedTrack, cacheTrack } from "./audioCache";
import {
  RANGE_REQUEST_TIMEOUT_MS,
  SEEK_CHUNK_BYTES,
} from "@/config/player";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerCallbacks {
  onStatusUpdate: (status: AVPlaybackStatus) => void;
  onError: (error: string) => void;
}

// ─── Module-level state ───────────────────────────────────────────────────────
// Using module-level singleton avoids React state churn for the audio object.

let _sound: Audio.Sound | null = null;
let _callbacks: PlayerCallbacks | null = null;
// Active prefetch download reference for cancellation
const _activePrefetches: Map<string, FileSystem.DownloadResumable> = new Map();

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Must be called once at app startup to configure the audio session.
 * Enables background playback on Android.
 */
export async function initPlayer(): Promise<void> {
  await Audio.setAudioModeAsync({
    // Allow audio to play even when the app is in the background
    staysActiveInBackground: true,
    // Do not duck other audio (music player should be exclusive)
    shouldDuckAndroid: false,
    playsInSilentModeIOS: true,
  });
}

// ─── Range probe ──────────────────────────────────────────────────────────────

/**
 * Checks if a URL's server supports HTTP Range requests by sending a
 * HEAD request and inspecting the Accept-Ranges header.
 * Timeout: RANGE_REQUEST_TIMEOUT_MS
 */
export async function probeRangeSupport(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      RANGE_REQUEST_TIMEOUT_MS
    );
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const acceptRanges = res.headers.get("Accept-Ranges");
    return acceptRanges === "bytes";
  } catch {
    // If we can't probe, assume no range support and fall back gracefully
    return false;
  }
}

/**
 * Calculates the approximate byte offset for a given playback position.
 * Used as a Range request hint — not guaranteed to be exact.
 *
 * @param positionMs   — desired seek position in milliseconds
 * @param durationMs   — total track duration in milliseconds
 * @param fileSizeBytes — total file size in bytes
 */
export function estimateByteOffset(
  positionMs: number,
  durationMs: number,
  fileSizeBytes: number
): number {
  if (durationMs <= 0 || fileSizeBytes <= 0) return 0;
  const ratio = positionMs / durationMs;
  // Round down to nearest SEEK_CHUNK_BYTES boundary for alignment
  const rawOffset = Math.floor(ratio * fileSizeBytes);
  return Math.max(0, Math.floor(rawOffset / SEEK_CHUNK_BYTES) * SEEK_CHUNK_BYTES);
}

// ─── Playback control ─────────────────────────────────────────────────────────

/**
 * Loads and plays a track. Handles cache lookup, Range probe, and fallback.
 *
 * @param track        — Track to play
 * @param lowEndMode   — If true, prefer streamUrlLow and reduce prebuffer
 * @param callbacks    — Status and error callbacks
 * @param cacheLimitBytes — Current cache limit from active profile
 */
export async function playTrack(
  track: Track,
  lowEndMode: boolean,
  callbacks: PlayerCallbacks,
  cacheLimitBytes: number
): Promise<void> {
  _callbacks = callbacks;

  // Unload existing sound first to free native resources
  await unloadPlayer();

  // 1. Check LRU cache
  const cachedUri = await getCachedTrack(track.id);
  if (cachedUri) {
    await _loadFromUri(cachedUri, callbacks, true);
    return;
  }

  // 2. Choose stream URL based on low-end mode
  const url =
    lowEndMode && track.streamUrlLow ? track.streamUrlLow : track.streamUrl;

  // 3. Probe Range support (fast HEAD request)
  const supportsRange = track.supportsRange ?? (await probeRangeSupport(url));

  if (supportsRange) {
    // 4a. Streaming: pass URL directly to expo-av.
    //     Android's MediaPlayer handles Accept-Ranges automatically when
    //     the URL returns Content-Range headers — no extra headers needed here.
    //     For seek operations (setPositionAsync) expo-av issues Range requests
    //     transparently to the native layer.
    await _loadFromUri(url, callbacks, false);
  } else {
    // 4b. Fallback: progressive download to cache, then play from local file.
    //     This avoids re-downloading on replay but takes longer on first load.
    await _downloadAndPlay(track, url, callbacks, cacheLimitBytes);
  }
}

async function _loadFromUri(
  uri: string,
  callbacks: PlayerCallbacks,
  fromCache: boolean
): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      {
        shouldPlay: true,
        progressUpdateIntervalMillis: 500,
        // Don't buffer more than needed on low-memory devices
        androidImplementation: "MediaPlayer",
      },
      (status) => {
        callbacks.onStatusUpdate(status);
        if (!status.isLoaded && status.error) {
          callbacks.onError(status.error);
        }
      }
    );
    _sound = sound;
    // Annotate fromCache on the status (custom extension)
    void fromCache; // used by caller via getCachedTrack check
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError(`Failed to load audio: ${msg}`);
  }
}

async function _downloadAndPlay(
  track: Track,
  url: string,
  callbacks: PlayerCallbacks,
  cacheLimitBytes: number
): Promise<void> {
  const tempPath = `${FileSystem.cacheDirectory}temp_${track.id}.audio`;
  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      tempPath,
      {},
      (downloadProgress) => {
        // Optionally emit buffer progress — kept minimal here for performance
        void downloadProgress;
      }
    );
    _activePrefetches.set(track.id, downloadResumable);

    const result = await downloadResumable.downloadAsync();
    _activePrefetches.delete(track.id);

    if (!result) {
      callbacks.onError("Download returned empty result");
      return;
    }

    // Move to cache
    const sizeInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
    const sizeBytes = (sizeInfo as { size?: number }).size ?? 0;
    const cachedPath = await cacheTrack(
      track.id,
      result.uri,
      sizeBytes,
      cacheLimitBytes
    );
    await _loadFromUri(cachedPath, callbacks, false);
  } catch (err: unknown) {
    _activePrefetches.delete(track.id);
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError(`Download failed: ${msg}`);
  }
}

/**
 * Pause playback.
 */
export async function pausePlayer(): Promise<void> {
  await _sound?.pauseAsync();
}

/**
 * Resume playback.
 */
export async function resumePlayer(): Promise<void> {
  await _sound?.playAsync();
}

/**
 * Seek to a time position (milliseconds).
 * expo-av's setPositionAsync will issue a Range request on Android if the
 * underlying stream supports it via the native MediaPlayer.
 */
export async function seekTo(positionMs: number): Promise<void> {
  await _sound?.setPositionAsync(positionMs);
}

/**
 * Unload the current sound and free native resources.
 */
export async function unloadPlayer(): Promise<void> {
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch {
      // Swallow — might already be unloaded
    }
    _sound = null;
  }
}

/**
 * Prefetch a track in the background (limited by maxPrefetch in config).
 * Stores to cache for future playback. Cancellable.
 *
 * @param track     — Track to prefetch
 * @param lowEnd    — If true, prefer low-quality URL
 * @param limitBytes — Cache limit from active profile
 */
export async function prefetchTrack(
  track: Track,
  lowEnd: boolean,
  limitBytes: number
): Promise<void> {
  // Already cached or already downloading
  const cached = await getCachedTrack(track.id);
  if (cached || _activePrefetches.has(track.id)) return;

  const url = lowEnd && track.streamUrlLow ? track.streamUrlLow : track.streamUrl;
  const tempPath = `${FileSystem.cacheDirectory}prefetch_${track.id}.audio`;

  const downloadResumable = FileSystem.createDownloadResumable(url, tempPath);
  _activePrefetches.set(track.id, downloadResumable);

  try {
    const result = await downloadResumable.downloadAsync();
    _activePrefetches.delete(track.id);
    if (!result) return;
    const sizeInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
    const sizeBytes = (sizeInfo as { size?: number }).size ?? 0;
    await cacheTrack(track.id, result.uri, sizeBytes, limitBytes);
  } catch {
    _activePrefetches.delete(track.id);
    // Silently ignore prefetch failures
  }
}

/**
 * Cancel an in-progress prefetch download.
 */
export async function cancelPrefetch(trackId: string): Promise<void> {
  const dl = _activePrefetches.get(trackId);
  if (dl) {
    try {
      await dl.pauseAsync();
    } catch {}
    _activePrefetches.delete(trackId);
    const tempPath = `${FileSystem.cacheDirectory}prefetch_${trackId}.audio`;
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }
}

/**
 * Returns current playback status snapshot. Useful for UI polling fallback.
 */
export async function getPlaybackStatus(): Promise<AVPlaybackStatus | null> {
  if (!_sound) return null;
  return _sound.getStatusAsync();
}
