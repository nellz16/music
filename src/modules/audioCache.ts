/**
 * audioCache.ts — LRU offline cache backed by expo-file-system.
 *
 * Design decisions:
 *  - Cache index stored in AsyncStorage (lightweight key/value).
 *  - Files stored in FileSystem.cacheDirectory/music_cache/.
 *  - On every access, the entry's lastAccessedAt is updated → LRU order.
 *  - When total cached bytes exceeds cacheLimitBytes, the least-recently-used
 *    entries are evicted until we are under the limit.
 *  - Eviction runs asynchronously so it never blocks playback.
 *
 * Security note: file paths are derived from track IDs using a safe encoding.
 * Never pass raw user input as a file path suffix.
 */

import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CacheEntry } from "@/utils/types";
import { CACHE_DIR_NAME, CACHE_MAX_AGE_MS } from "@/config/player";

const CACHE_INDEX_KEY = "music_cache_index_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitize a track ID to a safe filename (alphanumeric + dash/underscore only) */
function safeFileName(trackId: string): string {
  return trackId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getCacheDir(): string {
  return `${FileSystem.cacheDirectory}${CACHE_DIR_NAME}/`;
}

async function ensureCacheDir(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// ─── Index management ─────────────────────────────────────────────────────────

async function readIndex(): Promise<CacheEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CacheEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(entries: CacheEntry[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the local file URI for a cached track, or null if not cached.
 * Also updates the lastAccessedAt timestamp (LRU bookkeeping).
 */
export async function getCachedTrack(trackId: string): Promise<string | null> {
  const entries = await readIndex();
  const idx = entries.findIndex((e) => e.trackId === trackId);
  if (idx === -1) return null;

  const entry = entries[idx];
  const info = await FileSystem.getInfoAsync(entry.filePath);
  if (!info.exists) {
    // File was deleted externally — remove from index
    entries.splice(idx, 1);
    await writeIndex(entries);
    return null;
  }

  // Expire stale entries
  if (Date.now() - entry.lastAccessedAt > CACHE_MAX_AGE_MS) {
    await evictEntry(entry);
    entries.splice(idx, 1);
    await writeIndex(entries);
    return null;
  }

  // Update LRU timestamp
  entries[idx] = { ...entry, lastAccessedAt: Date.now() };
  await writeIndex(entries);
  return entry.filePath;
}

/**
 * Writes a downloaded blob (as a local temp file) into the cache.
 * After writing, triggers async LRU eviction if over limit.
 *
 * @param trackId  — Track identifier
 * @param sourceUri — Local URI of the downloaded file (from FileSystem.downloadAsync)
 * @param sizeBytes — File size in bytes
 * @param limitBytes — Maximum total cache size before eviction triggers
 */
export async function cacheTrack(
  trackId: string,
  sourceUri: string,
  sizeBytes: number,
  limitBytes: number
): Promise<string> {
  await ensureCacheDir();
  const destPath = `${getCacheDir()}${safeFileName(trackId)}.audio`;

  // Move from temp download location to cache directory
  await FileSystem.moveAsync({ from: sourceUri, to: destPath });

  const entries = await readIndex();
  const existing = entries.findIndex((e) => e.trackId === trackId);
  const newEntry: CacheEntry = {
    trackId,
    filePath: destPath,
    fileSizeBytes: sizeBytes,
    lastAccessedAt: Date.now(),
  };

  if (existing !== -1) {
    entries[existing] = newEntry;
  } else {
    entries.push(newEntry);
  }

  await writeIndex(entries);

  // Async eviction — does not block playback
  evictToFitLimit(entries, limitBytes).catch(() => {});

  return destPath;
}

/**
 * Removes all cached files and clears the index.
 */
export async function clearCache(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
  await AsyncStorage.removeItem(CACHE_INDEX_KEY);
}

/**
 * Returns total bytes currently in the cache.
 */
export async function getCacheStats(): Promise<{
  totalBytes: number;
  entryCount: number;
}> {
  const entries = await readIndex();
  const totalBytes = entries.reduce((acc, e) => acc + e.fileSizeBytes, 0);
  return { totalBytes, entryCount: entries.length };
}

// ─── LRU Eviction ─────────────────────────────────────────────────────────────

async function evictEntry(entry: CacheEntry): Promise<void> {
  await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
}

/**
 * Evicts least-recently-used entries until total size <= limitBytes.
 */
async function evictToFitLimit(
  entries: CacheEntry[],
  limitBytes: number
): Promise<void> {
  let total = entries.reduce((acc, e) => acc + e.fileSizeBytes, 0);
  if (total <= limitBytes) return;

  // Sort ascending by lastAccessedAt so we evict oldest first
  const sorted = [...entries].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
  const toKeep: CacheEntry[] = [...entries];

  for (const entry of sorted) {
    if (total <= limitBytes) break;
    await evictEntry(entry);
    const idx = toKeep.findIndex((e) => e.trackId === entry.trackId);
    if (idx !== -1) toKeep.splice(idx, 1);
    total -= entry.fileSizeBytes;
  }

  await writeIndex(toKeep);
}
